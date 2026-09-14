import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { AppointmentStatus } from "@odontoflow/db";
import { PrismaService } from "../../database/prisma.service";
import type { AuthenticatedUser } from "../../common/decorators/current-user.decorator";
import { ehDentista, SEM_PROFISSIONAL } from "../../common/scope/dentist-scope.util";
import { WhatsAppGatewayService } from "../integrations/whatsapp-gateway.service";
import { getWorkingSlots, isClosedDay, isoDate, nextBookableDays, weekdayLabel, SLOT_DURATION_MINUTES } from "./availability.util";
import { formatZonedIsoDate, formatZonedTime, getZonedParts, zonedDateTimeToUtc } from "./timezone.util";
import { CreatePublicAppointmentDto } from "./dto/create-public-appointment.dto";
import { CreateAppointmentDto } from "./dto/create-appointment.dto";

const ACTIVE_STATUSES: AppointmentStatus[] = [
  "SCHEDULED",
  "CONFIRMED",
  "WAITING",
  "FILLING_FORM",
  "COMPLETED",
];

@Injectable()
export class SchedulingService {
  private readonly logger = new Logger(SchedulingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsapp: WhatsAppGatewayService,
  ) {}

  /**
   * Envio de confirmação é um efeito colateral — nunca deve derrubar o
   * agendamento se o provedor de WhatsApp falhar (log e segue).
   */
  private async notifyAppointment(
    clinicId: string,
    phone: string | null,
    patientName: string,
    startAt: Date,
    professionalName: string,
    timezone: string,
  ) {
    if (!phone) return;
    try {
      await this.whatsapp.sendAppointmentConfirmation(clinicId, phone, {
        patientName,
        whenLabel: `${formatZonedIsoDate(startAt, timezone)} às ${formatZonedTime(startAt, timezone)}`,
        professionalName,
      });
    } catch (error) {
      this.logger.warn(`Falha ao enviar confirmação por WhatsApp: ${(error as Error).message}`);
    }
  }

  private async getTimezone(clinicId: string): Promise<string> {
    const clinic = await this.prisma.clinic.findUniqueOrThrow({
      where: { id: clinicId },
      select: { timezone: true },
    });
    return clinic.timezone;
  }

  /** Início/fim (em UTC) do dia civil `dateIso` no fuso da clínica. */
  private dayBoundsUtc(dateIso: string, timezone: string) {
    const start = zonedDateTimeToUtc(dateIso, "00:00", timezone);
    const end = zonedDateTimeToUtc(dateIso, "23:59", timezone);
    return { start, end };
  }

  /**
   * Janela de dias para o seletor "Escolha o dia" do agendamento público.
   *
   * `fromIso` desloca a janela para frente, o que dá ao paciente a navegação
   * por semana. Nunca aceita data anterior a hoje: a janela é só de escolha,
   * mas deixar pedir o passado abriria caminho para marcar consulta em dia que
   * já foi — a validação real de horário vive em `getAvailability`, e ela
   * também não devolve slot passado.
   */
  async getBookableDays(clinicId: string, professionalId: string, count = 6, fromIso?: string) {
    const timezone = await this.getTimezone(clinicId);
    const todayInClinic = getZonedParts(new Date(), timezone);

    let inicio = todayInClinic;
    if (fromIso) {
      const [ano, mes, dia] = fromIso.split("-").map(Number);
      if (!ano || !mes || !dia) {
        throw new BadRequestException("Data inválida.");
      }
      const pedido = Date.UTC(ano, mes - 1, dia);
      const hoje = Date.UTC(todayInClinic.year, todayInClinic.month - 1, todayInClinic.day);
      if (pedido > hoje) {
        inicio = { ...todayInClinic, year: ano, month: mes, day: dia };
      }
    }

    const days = nextBookableDays(inicio, count);

    const { start: from } = this.dayBoundsUtc(isoDate(days[0]), timezone);
    const { end: to } = this.dayBoundsUtc(isoDate(days[days.length - 1]), timezone);

    const appointments = await this.prisma.appointment.findMany({
      where: {
        clinicId,
        professionalId,
        startAt: { gte: from, lte: to },
        status: { in: ACTIVE_STATUSES },
      },
      select: { startAt: true },
    });

    const slotsPerDay = getWorkingSlots().length;
    const bookedCountByDate = new Map<string, number>();
    for (const appt of appointments) {
      const key = formatZonedIsoDate(appt.startAt, timezone);
      bookedCountByDate.set(key, (bookedCountByDate.get(key) ?? 0) + 1);
    }

    // Hoje só tem os horários que ainda não passaram — o dia continua listado
    // (como sábado, que aparece fechado), mas "cheio" mais cedo se não sobrar
    // horário livre no resto do expediente.
    const todayIso = isoDate(todayInClinic);
    const nowHora = `${String(todayInClinic.hour).padStart(2, "0")}:${String(todayInClinic.minute).padStart(2, "0")}`;
    const remainingSlotsToday = getWorkingSlots().filter((hora) => hora > nowHora).length;

    return days.map((day) => {
      const iso = isoDate(day);
      const closed = isClosedDay(day.weekday);
      const booked = bookedCountByDate.get(iso) ?? 0;
      const totalSlots = iso === todayIso ? remainingSlotsToday : slotsPerDay;
      return {
        iso,
        semana: weekdayLabel(day),
        numero: String(day.day).padStart(2, "0"),
        livre: !closed && booked < totalSlots,
      };
    });
  }

  /** Horários livres de um profissional num dia específico. */
  async getAvailability(clinicId: string, professionalId: string, dateIso: string) {
    const timezone = await this.getTimezone(clinicId);
    const [year, month, day] = dateIso.split("-").map(Number);
    if (!year || !month || !day) {
      throw new BadRequestException("Data inválida.");
    }
    const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
    if (isClosedDay(weekday)) {
      return getWorkingSlots().map((hora) => ({ hora, livre: false }));
    }

    const { start, end } = this.dayBoundsUtc(dateIso, timezone);

    const appointments = await this.prisma.appointment.findMany({
      where: {
        clinicId,
        professionalId,
        startAt: { gte: start, lte: end },
        status: { in: ACTIVE_STATUSES },
      },
      select: { startAt: true },
    });
    const bookedTimes = new Set(appointments.map((a) => formatZonedTime(a.startAt, timezone)));

    // Não mostra (nem como "ocupado") horário que já passou — só faz sentido
    // aplicar isso quando o dia pedido é hoje no fuso da clínica.
    const now = new Date();
    const isHoje = dateIso === formatZonedIsoDate(now, timezone);
    const horaAtual = formatZonedTime(now, timezone);

    return getWorkingSlots()
      .filter((hora) => !isHoje || hora > horaAtual)
      .map((hora) => ({ hora, livre: !bookedTimes.has(hora) }));
  }

  /** Cria o agendamento vindo do link público — sem autenticação, cria o paciente se preciso. */
  async createPublicAppointment(clinicId: string, dto: CreatePublicAppointmentDto) {
    const [professional, timezone] = await Promise.all([
      this.prisma.professional.findFirst({ where: { id: dto.professionalId, clinicId } }),
      this.getTimezone(clinicId),
    ]);
    if (!professional) {
      throw new NotFoundException("Profissional não encontrado.");
    }

    const [year, month, day] = dto.date.split("-").map(Number);
    const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
    if (isClosedDay(weekday) || weekday === 0) {
      throw new BadRequestException("A clínica não atende neste dia.");
    }

    const startAt = zonedDateTimeToUtc(dto.date, dto.time, timezone);
    if (startAt <= new Date()) {
      throw new BadRequestException("Esse horário já passou — escolha outro.");
    }
    const endAt = new Date(startAt.getTime() + SLOT_DURATION_MINUTES * 60_000);

    const conflicting = await this.prisma.appointment.findFirst({
      where: {
        clinicId,
        professionalId: dto.professionalId,
        startAt,
        status: { in: ACTIVE_STATUSES },
      },
    });
    if (conflicting) {
      throw new ConflictException("Esse horário acabou de ser preenchido — escolha outro.");
    }

    let patient = await this.prisma.patient.findFirst({
      where: {
        clinicId,
        OR: [
          { phone: dto.patientPhone },
          ...(dto.patientEmail ? [{ email: dto.patientEmail }] : []),
        ],
      },
    });

    if (!patient) {
      patient = await this.prisma.patient.create({
        data: {
          clinicId,
          name: dto.patientName,
          phone: dto.patientPhone,
          email: dto.patientEmail,
          cpf: dto.patientCpf,
          consentLGPDAt: new Date(),
        },
      });
    } else if (!patient.consentLGPDAt) {
      patient = await this.prisma.patient.update({
        where: { id: patient.id },
        data: { consentLGPDAt: new Date() },
      });
    }

    // `select` explícito, nunca `include: { user: true }`.
    //
    // Esta rota é PÚBLICA e sem autenticação. Com `include` o Prisma devolve a
    // linha inteira de `User` — incluindo `passwordHash` — e a de `Patient`
    // inteira, com CPF, RG, endereço e contato de emergência. Como o paciente
    // é localizado por telefone OU e-mail, qualquer pessoa que soubesse o
    // telefone de alguém receberia a ficha completa dessa pessoa só marcando
    // uma consulta. Aqui sai só o que a tela de confirmação mostra.
    const appointment = await this.prisma.appointment.create({
      data: {
        clinicId,
        patientId: patient.id,
        professionalId: dto.professionalId,
        startAt,
        endAt,
        status: "SCHEDULED",
        source: "public-booking",
      },
      select: {
        id: true,
        startAt: true,
        endAt: true,
        status: true,
        professional: { select: { id: true, user: { select: { name: true } } } },
      },
    });

    await this.notifyAppointment(
      clinicId,
      patient.phone,
      patient.name,
      startAt,
      appointment.professional.user.name,
      timezone,
    );

    return appointment;
  }

  /**
   * Agenda do dia (no fuso da clínica) para o dashboard interno.
   * `professionalId` restringe à agenda daquele profissional — é o escopo do
   * dentista. Nulo = agenda inteira (admin, recepção).
   */
  async getAgendaForDay(clinicId: string, dateIso: string, professionalId?: string | null) {
    return this.getAgendaForRange(clinicId, dateIso, 1, professionalId);
  }

  /**
   * Agenda de `dias` dias civis consecutivos a partir de `dateIso`, no fuso da
   * clínica. Uma consulta só para a semana inteira em vez de sete — a tela da
   * semana pediria sete idas ao banco, e o agrupamento por dia é trivial de
   * fazer no front a partir de `startAt`.
   */
  async getAgendaForRange(
    clinicId: string,
    dateIso: string,
    dias: number,
    professionalId?: string | null,
  ) {
    const timezone = await this.getTimezone(clinicId);
    const total = Math.min(Math.max(Math.trunc(dias) || 1, 1), 31);
    const { start } = this.dayBoundsUtc(dateIso, timezone);

    // O último dia é calculado no calendário civil (Date.UTC como ferramenta de
    // aritmética, nunca como instante) e só então convertido — somar
    // `dias * 24h` ao instante erraria a borda em fuso com horário de verão.
    const [ano, mes, dia] = dateIso.split("-").map(Number);
    const ultimo = new Date(Date.UTC(ano, mes - 1, dia + total - 1));
    const ultimoIso = `${ultimo.getUTCFullYear()}-${String(ultimo.getUTCMonth() + 1).padStart(2, "0")}-${String(
      ultimo.getUTCDate(),
    ).padStart(2, "0")}`;
    const { end } = this.dayBoundsUtc(ultimoIso, timezone);

    return this.prisma.appointment.findMany({
      where: {
        clinicId,
        startAt: { gte: start, lte: end },
        ...(professionalId ? { professionalId } : {}),
      },
      include: {
        patient: { select: { id: true, name: true } },
        professional: { select: { id: true, user: { select: { name: true } } } },
      },
      orderBy: { startAt: "asc" },
    });
  }

  /** Id do `Professional` do usuário quando ele é DENTIST nesta clínica; nulo para os demais. */
  async escopoDoProfissional(user: AuthenticatedUser, clinicId: string): Promise<string | null> {
    if (!ehDentista(user, clinicId)) return null;
    const profissional = await this.prisma.professional.findFirst({
      where: { clinicId, userId: user.userId },
      select: { id: true },
    });
    return profissional?.id ?? SEM_PROFISSIONAL;
  }

  async createInternalAppointment(clinicId: string, dto: CreateAppointmentDto) {
    const [patient, professional] = await Promise.all([
      this.prisma.patient.findFirst({ where: { id: dto.patientId, clinicId } }),
      this.prisma.professional.findFirst({ where: { id: dto.professionalId, clinicId } }),
    ]);
    if (!patient) throw new NotFoundException("Paciente não encontrado.");
    if (!professional) throw new NotFoundException("Profissional não encontrado.");

    const startAt = new Date(dto.startAt);
    const endAt = new Date(startAt.getTime() + (dto.durationMinutes ?? SLOT_DURATION_MINUTES) * 60_000);

    const conflicting = await this.prisma.appointment.findFirst({
      where: {
        clinicId,
        professionalId: dto.professionalId,
        status: { in: ACTIVE_STATUSES },
        startAt: { lt: endAt },
        endAt: { gt: startAt },
      },
    });
    if (conflicting) {
      throw new ConflictException("Já existe uma consulta nesse horário para este profissional.");
    }

    return this.prisma.appointment.create({
      data: {
        clinicId,
        patientId: dto.patientId,
        professionalId: dto.professionalId,
        startAt,
        endAt,
        notes: dto.notes,
        source: "internal",
      },
    });
  }

  async updateStatus(clinicId: string, id: string, status: AppointmentStatus) {
    const appointment = await this.prisma.appointment.findFirst({
      where: { id, clinicId },
      // Só os campos usados pela notificação. Buscar a linha inteira de `User`
      // traria o `passwordHash` para a memória sem necessidade, e bastaria
      // alguém trocar o `return updated` por `return appointment` para virar
      // vazamento.
      select: {
        startAt: true,
        patient: { select: { name: true, phone: true } },
        professional: { select: { user: { select: { name: true } } } },
      },
    });
    if (!appointment) {
      throw new NotFoundException("Consulta não encontrada.");
    }
    const updated = await this.prisma.appointment.update({ where: { id }, data: { status } });

    if (status === "CONFIRMED") {
      const timezone = await this.getTimezone(clinicId);
      await this.notifyAppointment(
        clinicId,
        appointment.patient.phone,
        appointment.patient.name,
        appointment.startAt,
        appointment.professional.user.name,
        timezone,
      );
    }

    return updated;
  }
}
