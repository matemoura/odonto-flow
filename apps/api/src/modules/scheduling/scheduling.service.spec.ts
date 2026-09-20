import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { AppointmentStatus } from "@odontoflow/db";
import { SchedulingService } from "./scheduling.service";
import { PrismaService } from "../../database/prisma.service";
import { WhatsAppGatewayService } from "../integrations/whatsapp-gateway.service";
import { zonedDateTimeToUtc } from "./timezone.util";

function fakePrisma(overrides: Record<string, unknown> = {}) {
  return {
    clinic: {
      findUniqueOrThrow: jest.fn().mockResolvedValue({
        timezone: "America/Sao_Paulo",
        workingWeekdays: [1, 2, 3, 4, 5],
        // Mesmos valores do @default do schema: sem eles o expediente vem
        // `undefined` e a grade sai vazia, escondendo o que o teste mede.
        morningStartMinutes: 480,
        morningEndMinutes: 720,
        afternoonStartMinutes: 780,
        afternoonEndMinutes: 1080,
        slotDurationMinutes: 40,
      }),
      update: jest.fn(),
    },
    appointment: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue(null),
      findUniqueOrThrow: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    patient: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
      update: jest.fn(),
    },
    professional: {
      findFirst: jest.fn().mockResolvedValue({ id: "prof-1" }),
    },
    ...overrides,
  } as unknown as PrismaService;
}

function fakeWhatsapp(overrides: Record<string, unknown> = {}) {
  return {
    sendAppointmentConfirmation: jest.fn().mockResolvedValue({ externalId: "wa-1" }),
    ...overrides,
  } as unknown as WhatsAppGatewayService;
}

/**
 * Próxima data (YYYY-MM-DD) com o weekday pedido, sempre estritamente no
 * futuro (nunca hoje) — createPublicAppointment agora recusa horário no
 * passado, então os testes não podem usar uma data fixa que "envelhece".
 */
function nextDateForWeekday(targetWeekday: number): string {
  const now = new Date();
  const base = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const currentWeekday = new Date(base).getUTCDay();
  const daysAhead = (targetWeekday - currentWeekday + 7) % 7 || 7;
  const target = new Date(base + daysAhead * 86_400_000);
  return `${target.getUTCFullYear()}-${String(target.getUTCMonth() + 1).padStart(2, "0")}-${String(
    target.getUTCDate(),
  ).padStart(2, "0")}`;
}

function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d) + days * 86_400_000);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}

const PROXIMO_SABADO = nextDateForWeekday(6);
const PROXIMO_DOMINGO = nextDateForWeekday(0);
const PROXIMA_QUINTA = nextDateForWeekday(4);
const QUINTA_SEGUINTE = addDays(PROXIMA_QUINTA, 7);

describe("SchedulingService.createInternalAppointment", () => {
  it("recusa quando o paciente não existe nesta clínica", async () => {
    const prisma = fakePrisma();
    (prisma.patient.findFirst as jest.Mock).mockResolvedValue(null);
    const service = new SchedulingService(prisma, fakeWhatsapp());

    await expect(
      service.createInternalAppointment("clinic-1", {
        patientId: "p1",
        professionalId: "prof-1",
        date: "2026-09-10",
        time: "10:00",
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it("recusa quando já existe consulta conflitante para o profissional", async () => {
    const prisma = fakePrisma();
    (prisma.patient.findFirst as jest.Mock).mockResolvedValue({ id: "p1" });
    (prisma.appointment.findFirst as jest.Mock).mockResolvedValue({ id: "existing-appt" });
    const service = new SchedulingService(prisma, fakeWhatsapp());

    await expect(
      service.createInternalAppointment("clinic-1", {
        patientId: "p1",
        professionalId: "prof-1",
        date: "2026-09-10",
        time: "10:00",
      }),
    ).rejects.toThrow(ConflictException);
  });

  it("cria a consulta com a duração padrão quando durationMinutes não é informado", async () => {
    const prisma = fakePrisma();
    (prisma.patient.findFirst as jest.Mock).mockResolvedValue({ id: "p1" });
    (prisma.appointment.create as jest.Mock).mockResolvedValue({ id: "new-appt" });
    const service = new SchedulingService(prisma, fakeWhatsapp());

    await service.createInternalAppointment("clinic-1", {
      patientId: "p1",
      professionalId: "prof-1",
      date: "2026-09-10",
      time: "10:00",
    });

    const callArgs = (prisma.appointment.create as jest.Mock).mock.calls[0][0];
    const startAt = new Date(callArgs.data.startAt);
    const endAt = new Date(callArgs.data.endAt);
    expect((endAt.getTime() - startAt.getTime()) / 60_000).toBe(40);
  });
});

describe("SchedulingService.createPublicAppointment", () => {
  it("recusa agendamento no sábado (fechado)", async () => {
    const prisma = fakePrisma();
    const service = new SchedulingService(prisma, fakeWhatsapp());

    await expect(
      service.createPublicAppointment("clinic-1", {
        professionalId: "prof-1",
        date: PROXIMO_SABADO,
        time: "09:00",
        patientName: "Fulano",
        patientPhone: "+5511900000000",
        consentLGPD: true,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it("recusa agendamento no domingo (weekday === 0)", async () => {
    const prisma = fakePrisma();
    const service = new SchedulingService(prisma, fakeWhatsapp());

    await expect(
      service.createPublicAppointment("clinic-1", {
        professionalId: "prof-1",
        date: PROXIMO_DOMINGO,
        time: "09:00",
        patientName: "Fulano",
        patientPhone: "+5511900000000",
        consentLGPD: true,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it("recusa quando o horário acabou de ser preenchido por outra pessoa", async () => {
    const prisma = fakePrisma();
    (prisma.appointment.findFirst as jest.Mock).mockResolvedValue({ id: "conflict" });
    const service = new SchedulingService(prisma, fakeWhatsapp());

    await expect(
      service.createPublicAppointment("clinic-1", {
        professionalId: "prof-1",
        date: PROXIMA_QUINTA,
        time: "09:00",
        patientName: "Fulano",
        patientPhone: "+5511900000000",
        consentLGPD: true,
      }),
    ).rejects.toThrow(ConflictException);
  });

  it("cria um paciente novo com consentimento registrado quando ninguém bate com telefone/e-mail", async () => {
    const prisma = fakePrisma();
    (prisma.patient.create as jest.Mock).mockResolvedValue({
      id: "new-patient",
      name: "Fulano",
      phone: "+5511900000000",
    });
    (prisma.appointment.create as jest.Mock).mockResolvedValue({
      id: "appt-1",
      professional: { user: { name: "Dra. Ana" } },
    });
    const service = new SchedulingService(prisma, fakeWhatsapp());

    await service.createPublicAppointment("clinic-1", {
      professionalId: "prof-1",
      date: PROXIMA_QUINTA,
      time: "09:00",
      patientName: "Fulano",
      patientPhone: "+5511900000000",
      consentLGPD: true,
    });

    expect(prisma.patient.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ consentLGPDAt: expect.any(Date) }) }),
    );
    expect(prisma.patient.update).not.toHaveBeenCalled();
  });

  it("preenche o consentimento de um paciente já existente que ainda não tinha consentido", async () => {
    const prisma = fakePrisma();
    (prisma.patient.findFirst as jest.Mock).mockResolvedValue({
      id: "existing-patient",
      name: "Fulano",
      phone: "+5511900000000",
      consentLGPDAt: null,
    });
    (prisma.patient.update as jest.Mock).mockResolvedValue({
      id: "existing-patient",
      name: "Fulano",
      phone: "+5511900000000",
      consentLGPDAt: new Date(),
    });
    (prisma.appointment.create as jest.Mock).mockResolvedValue({
      id: "appt-1",
      professional: { user: { name: "Dra. Ana" } },
    });
    const service = new SchedulingService(prisma, fakeWhatsapp());

    await service.createPublicAppointment("clinic-1", {
      professionalId: "prof-1",
      date: PROXIMA_QUINTA,
      time: "09:00",
      patientName: "Fulano",
      patientPhone: "+5511900000000",
      consentLGPD: true,
    });

    expect(prisma.patient.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { consentLGPDAt: expect.any(Date) } }),
    );
    expect(prisma.patient.create).not.toHaveBeenCalled();
  });

  it("não deixa uma falha no envio do WhatsApp derrubar o agendamento", async () => {
    const prisma = fakePrisma();
    (prisma.patient.create as jest.Mock).mockResolvedValue({
      id: "new-patient",
      name: "Fulano",
      phone: "+5511900000000",
    });
    (prisma.appointment.create as jest.Mock).mockResolvedValue({
      id: "appt-1",
      professional: { user: { name: "Dra. Ana" } },
    });
    const whatsapp = fakeWhatsapp({
      sendAppointmentConfirmation: jest.fn().mockRejectedValue(new Error("provedor fora do ar")),
    });
    const service = new SchedulingService(prisma, whatsapp);

    await expect(
      service.createPublicAppointment("clinic-1", {
        professionalId: "prof-1",
        date: PROXIMA_QUINTA,
        time: "09:00",
        patientName: "Fulano",
        patientPhone: "+5511900000000",
        consentLGPD: true,
      }),
    ).resolves.toEqual(expect.objectContaining({ id: "appt-1" }));
  });

  it("recusa um horário que já passou hoje", async () => {
    const prisma = fakePrisma();
    const service = new SchedulingService(prisma, fakeWhatsapp());
    jest.useFakeTimers().setSystemTime(zonedDateTimeToUtc(PROXIMA_QUINTA, "10:00", "America/Sao_Paulo"));

    try {
      await expect(
        service.createPublicAppointment("clinic-1", {
          professionalId: "prof-1",
          date: PROXIMA_QUINTA,
          time: "09:00",
          patientName: "Fulano",
          patientPhone: "+5511900000000",
          consentLGPD: true,
        }),
      ).rejects.toThrow(BadRequestException);
    } finally {
      jest.useRealTimers();
    }
  });
});

describe("SchedulingService.getAvailability", () => {
  it("não mostra (nem como ocupado) horário de hoje que já passou", async () => {
    const prisma = fakePrisma();
    const service = new SchedulingService(prisma, fakeWhatsapp());
    jest.useFakeTimers().setSystemTime(zonedDateTimeToUtc(PROXIMA_QUINTA, "10:15", "America/Sao_Paulo"));

    try {
      const slots = await service.getAvailability("clinic-1", "prof-1", PROXIMA_QUINTA);
      const horarios = slots.map((s) => s.hora);
      expect(horarios).not.toContain("08:00");
      expect(horarios).not.toContain("10:00");
      expect(horarios).toContain("10:40");
    } finally {
      jest.useRealTimers();
    }
  });

  it("mostra todos os horários normalmente para um dia que não é hoje", async () => {
    const prisma = fakePrisma();
    const service = new SchedulingService(prisma, fakeWhatsapp());
    jest.useFakeTimers().setSystemTime(zonedDateTimeToUtc(PROXIMA_QUINTA, "10:15", "America/Sao_Paulo"));

    try {
      const slots = await service.getAvailability("clinic-1", "prof-1", QUINTA_SEGUINTE);
      expect(slots.map((s) => s.hora)).toContain("08:00");
    } finally {
      jest.useRealTimers();
    }
  });
});

describe("SchedulingService.getBookableDays", () => {
  it("marca hoje como cheio quando não sobra horário no resto do expediente", async () => {
    const prisma = fakePrisma();
    const service = new SchedulingService(prisma, fakeWhatsapp());
    jest.useFakeTimers().setSystemTime(zonedDateTimeToUtc(PROXIMA_QUINTA, "17:50", "America/Sao_Paulo"));

    try {
      const [hoje] = await service.getBookableDays("clinic-1", "prof-1", 1);
      expect(hoje.iso).toBe(PROXIMA_QUINTA);
      expect(hoje.livre).toBe(false);
    } finally {
      jest.useRealTimers();
    }
  });
});

describe("SchedulingService.updateStatus", () => {
  it("recusa quando a consulta não existe", async () => {
    const prisma = fakePrisma();
    (prisma.appointment.findFirst as jest.Mock).mockResolvedValue(null);
    const service = new SchedulingService(prisma, fakeWhatsapp());

    await expect(service.updateStatus("clinic-1", "appt-1", "CONFIRMED")).rejects.toThrow(NotFoundException);
  });

  it("notifica por WhatsApp só quando o status vira CONFIRMED", async () => {
    const prisma = fakePrisma();
    (prisma.appointment.findFirst as jest.Mock).mockResolvedValue({
      status: "SCHEDULED",
      startAt: new Date("2026-09-10T13:00:00.000Z"),
      endAt: new Date("2026-09-10T13:40:00.000Z"),
      professionalId: "prof-1",
      patient: { name: "Fulano", phone: "+5511900000000" },
      professional: { user: { name: "Dra. Ana" } },
    });
    (prisma.appointment.update as jest.Mock).mockResolvedValue({ id: "appt-1", status: "CONFIRMED" });
    const whatsapp = fakeWhatsapp();
    const service = new SchedulingService(prisma, whatsapp);

    await service.updateStatus("clinic-1", "appt-1", "CONFIRMED");
    expect(whatsapp.sendAppointmentConfirmation).toHaveBeenCalledTimes(1);
  });

  it("não notifica quando o status vira COMPLETED", async () => {
    const prisma = fakePrisma();
    (prisma.appointment.findFirst as jest.Mock).mockResolvedValue({
      status: "FILLING_FORM",
      startAt: new Date("2026-09-10T13:00:00.000Z"),
      endAt: new Date("2026-09-10T13:40:00.000Z"),
      professionalId: "prof-1",
      patient: { name: "Fulano", phone: "+5511900000000" },
      professional: { user: { name: "Dra. Ana" } },
    });
    (prisma.appointment.update as jest.Mock).mockResolvedValue({ id: "appt-1", status: "COMPLETED" });
    const whatsapp = fakeWhatsapp();
    const service = new SchedulingService(prisma, whatsapp);

    await service.updateStatus("clinic-1", "appt-1", "COMPLETED");
    expect(whatsapp.sendAppointmentConfirmation).not.toHaveBeenCalled();
  });
});

/**
 * Regressão de um vazamento real: a rota pública devolvia o resultado de um
 * `include: { patient: true, professional: { include: { user: true } } }`, ou
 * seja, a linha inteira de `User` (com `passwordHash`) e a de `Patient` (com
 * CPF, RG, endereço e contato de emergência) — numa rota sem autenticação
 * nenhuma. E como o paciente é localizado por telefone OU e-mail, quem
 * soubesse o telefone de alguém recebia a ficha completa dessa pessoa só
 * marcando uma consulta.
 *
 * O teste olha o `select` pedido ao Prisma, não a resposta: o mock devolve o
 * que mandarmos, então afirmar sobre a resposta não provaria nada.
 */
describe("SchedulingService.createPublicAppointment — superfície de dados da rota pública", () => {
  it("pede select explícito e nunca a linha inteira de user ou patient", async () => {
    const prisma = fakePrisma();
    (prisma.patient.create as jest.Mock).mockResolvedValue({ id: "p-1", name: "Fulano", phone: "+5511900000000" });
    (prisma.appointment.create as jest.Mock).mockResolvedValue({
      id: "appt-1",
      professional: { user: { name: "Dra. Ana" } },
    });
    const service = new SchedulingService(prisma, fakeWhatsapp());

    await service.createPublicAppointment("clinic-1", {
      professionalId: "prof-1",
      date: PROXIMA_QUINTA,
      time: "09:00",
      patientName: "Fulano",
      patientPhone: "+5511900000000",
      consentLGPD: true,
    });

    const args = (prisma.appointment.create as jest.Mock).mock.calls[0][0];

    expect(args.include).toBeUndefined();
    expect(args.select).toBeDefined();
    // Nada de paciente na resposta: a tela de confirmação não precisa, e quem
    // chama a rota não está autenticado.
    expect(args.select.patient).toBeUndefined();
    // Do profissional, só o nome.
    expect(args.select.professional.select.user.select).toEqual({ name: true });
    expect(JSON.stringify(args.select)).not.toContain("passwordHash");
  });
});

/**
 * O agendamento interno recebia um `startAt` ISO já montado pelo navegador de
 * quem preenche — ou seja, no fuso da MÁQUINA dele. Recepcionista em home
 * office noutro fuso, ou clínica em Manaus administrada de São Paulo, marcava
 * a consulta com uma hora de diferença, e a API confiava. A rota pública já
 * fazia certo; só a interna não.
 */
describe("SchedulingService.createInternalAppointment — hora no fuso da clínica", () => {
  it("resolve 10:00 como 10:00 NA CLÍNICA, não no fuso de quem preencheu", async () => {
    const prisma = fakePrisma();
    (prisma.patient.findFirst as jest.Mock).mockResolvedValue({ id: "p1" });
    (prisma.appointment.create as jest.Mock).mockResolvedValue({ id: "new-appt" });
    const service = new SchedulingService(prisma, fakeWhatsapp());

    await service.createInternalAppointment("clinic-1", {
      patientId: "p1",
      professionalId: "prof-1",
      date: "2026-09-10",
      time: "10:00",
      durationMinutes: 30,
    });

    const { data } = (prisma.appointment.create as jest.Mock).mock.calls[0][0];
    // Literal em Z escrito à mão: a clínica do fake está em America/Sao_Paulo
    // (UTC-3), então 10:00 lá são 13:00Z. Montar o esperado com `new Date()` a
    // partir de string sem fuso repetiria o próprio bug dentro do teste.
    expect(data.startAt.toISOString()).toBe("2026-09-10T13:00:00.000Z");
    expect(data.endAt.toISOString()).toBe("2026-09-10T13:30:00.000Z");
  });
});

/**
 * A recepção ganhou "Não veio" e "Cancelar", e a API ganhou a máquina de
 * transições que antes só existia como comentário no componente do front —
 * qualquer um dos sete status era aceito em qualquer ordem por quem chamasse
 * a rota direto.
 */
describe("SchedulingService.updateStatus — cancelar, faltar e remarcar", () => {
  function consulta(status: AppointmentStatus) {
    return {
      status,
      startAt: new Date("2026-09-10T13:00:00.000Z"),
      endAt: new Date("2026-09-10T13:40:00.000Z"),
      professionalId: "prof-1",
      patient: { name: "Fulano", phone: "+5511900000000" },
      professional: { user: { name: "Dra. Ana" } },
    };
  }

  it("cancela uma consulta confirmada", async () => {
    const prisma = fakePrisma();
    (prisma.appointment.findFirst as jest.Mock).mockResolvedValue(consulta("CONFIRMED"));
    (prisma.appointment.update as jest.Mock).mockResolvedValue({ id: "appt-1", status: "CANCELLED" });
    const service = new SchedulingService(prisma, fakeWhatsapp());

    await service.updateStatus("clinic-1", "appt-1", "CANCELLED");

    expect(prisma.appointment.update).toHaveBeenCalledWith({
      where: { id: "appt-1" },
      data: { status: "CANCELLED" },
    });
  });

  it("marca falta em quem não apareceu", async () => {
    const prisma = fakePrisma();
    (prisma.appointment.findFirst as jest.Mock).mockResolvedValue(consulta("SCHEDULED"));
    (prisma.appointment.update as jest.Mock).mockResolvedValue({ id: "appt-1", status: "NO_SHOW" });
    const service = new SchedulingService(prisma, fakeWhatsapp());

    await service.updateStatus("clinic-1", "appt-1", "NO_SHOW");

    expect(prisma.appointment.update).toHaveBeenCalledWith({
      where: { id: "appt-1" },
      data: { status: "NO_SHOW" },
    });
  });

  it("recusa ressuscitar uma consulta já concluída", async () => {
    const prisma = fakePrisma();
    (prisma.appointment.findFirst as jest.Mock).mockResolvedValue(consulta("COMPLETED"));
    const service = new SchedulingService(prisma, fakeWhatsapp());

    await expect(service.updateStatus("clinic-1", "appt-1", "SCHEDULED")).rejects.toThrow(
      BadRequestException,
    );
    expect(prisma.appointment.update).not.toHaveBeenCalled();
  });

  it("recusa transformar uma cancelada em concluída", async () => {
    const prisma = fakePrisma();
    (prisma.appointment.findFirst as jest.Mock).mockResolvedValue(consulta("CANCELLED"));
    const service = new SchedulingService(prisma, fakeWhatsapp());

    await expect(service.updateStatus("clinic-1", "appt-1", "COMPLETED")).rejects.toThrow(
      BadRequestException,
    );
  });

  it("clicar duas vezes no mesmo botão não é erro", async () => {
    const prisma = fakePrisma();
    (prisma.appointment.findFirst as jest.Mock).mockResolvedValue(consulta("CANCELLED"));
    (prisma.appointment.findUniqueOrThrow as jest.Mock).mockResolvedValue({ id: "appt-1" });
    const service = new SchedulingService(prisma, fakeWhatsapp());

    await expect(service.updateStatus("clinic-1", "appt-1", "CANCELLED")).resolves.toBeDefined();
    expect(prisma.appointment.update).not.toHaveBeenCalled();
  });

  // Cancelar libera o horário; nesse meio-tempo outra pessoa pode tê-lo pegado.
  // Sem esta checagem, "Remarcar" empilhava dois pacientes no mesmo encaixe.
  it("recusa remarcar quando o horário já foi ocupado por outra consulta", async () => {
    const prisma = fakePrisma();
    (prisma.appointment.findFirst as jest.Mock)
      .mockResolvedValueOnce(consulta("CANCELLED"))
      .mockResolvedValueOnce({ id: "outra-consulta" });
    const service = new SchedulingService(prisma, fakeWhatsapp());

    await expect(service.updateStatus("clinic-1", "appt-1", "SCHEDULED")).rejects.toThrow(
      ConflictException,
    );
    expect(prisma.appointment.update).not.toHaveBeenCalled();
  });

  it("remarca quando o horário continua livre", async () => {
    const prisma = fakePrisma();
    (prisma.appointment.findFirst as jest.Mock)
      .mockResolvedValueOnce(consulta("NO_SHOW"))
      .mockResolvedValueOnce(null);
    (prisma.appointment.update as jest.Mock).mockResolvedValue({ id: "appt-1", status: "SCHEDULED" });
    const service = new SchedulingService(prisma, fakeWhatsapp());

    await service.updateStatus("clinic-1", "appt-1", "SCHEDULED");

    expect(prisma.appointment.update).toHaveBeenCalledWith({
      where: { id: "appt-1" },
      data: { status: "SCHEDULED" },
    });
  });

  it("não procura conflito quando a mudança não reocupa horário", async () => {
    const prisma = fakePrisma();
    (prisma.appointment.findFirst as jest.Mock).mockResolvedValue(consulta("SCHEDULED"));
    (prisma.appointment.update as jest.Mock).mockResolvedValue({ id: "appt-1", status: "CONFIRMED" });
    const service = new SchedulingService(prisma, fakeWhatsapp());

    await service.updateStatus("clinic-1", "appt-1", "CONFIRMED");

    // Uma busca só: a da própria consulta.
    expect((prisma.appointment.findFirst as jest.Mock).mock.calls).toHaveLength(1);
  });
});
