import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { zonedDateTimeToUtc } from "../scheduling/timezone.util";
import { CreateCertificateDto } from "./dto/create-certificate.dto";

/**
 * `timeZone` é obrigatório de propósito: sem ele o Intl formata no fuso do
 * processo e, num servidor em UTC, um atestado da meia-noite em São Paulo sai
 * impresso com a data do dia anterior.
 */
function formatDateBR(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "long", timeZone }).format(date);
}

@Injectable()
export class CertificatesService {
  constructor(private readonly prisma: PrismaService) {}

  listForPatient(clinicId: string, patientId: string) {
    return this.prisma.certificate.findMany({
      where: { clinicId, patientId },
      include: { professional: { select: { croNumber: true, user: { select: { name: true } } } } },
      orderBy: { createdAt: "desc" },
    });
  }

  /** Usado pela página de impressão — só precisa do id, sem depender do patientId na rota. */
  async findOne(clinicId: string, id: string) {
    const certificate = await this.prisma.certificate.findFirst({
      where: { id, clinicId },
      include: { professional: { select: { croNumber: true, user: { select: { name: true } } } } },
    });
    if (!certificate) {
      throw new NotFoundException("Atestado não encontrado.");
    }
    return certificate;
  }

  async create(clinicId: string, dto: CreateCertificateDto) {
    const beneficiary = dto.beneficiary ?? "PATIENT";
    if (beneficiary === "COMPANION" && !dto.companionName) {
      throw new BadRequestException("Informe o nome do acompanhante.");
    }
    if (dto.type === "MEDICAL" && !dto.daysOff) {
      throw new BadRequestException("Informe a quantidade de dias de afastamento do atestado médico.");
    }

    const [patient, professional] = await Promise.all([
      this.prisma.patient.findFirst({ where: { id: dto.patientId, clinicId } }),
      this.prisma.professional.findFirst({
        where: { id: dto.professionalId, clinicId },
        include: { user: { select: { name: true } } },
      }),
    ]);
    if (!patient) {
      throw new NotFoundException("Paciente não encontrado.");
    }
    if (!professional) {
      throw new NotFoundException("Profissional não encontrado.");
    }
    const clinic = await this.prisma.clinic.findUniqueOrThrow({ where: { id: clinicId } });

    // A data da consulta é uma data civil; vira o instante da meia-noite no
    // fuso da clínica, não no do processo.
    const visitDate = zonedDateTimeToUtc(dto.visitDate, "00:00", clinic.timezone);
    const content = this.buildContent({
      clinicName: clinic.name,
      timeZone: clinic.timezone,
      type: dto.type,
      beneficiary,
      patientName: patient.name,
      companionName: dto.companionName,
      visitDate,
      arrivalTime: dto.arrivalTime,
      departureTime: dto.departureTime,
      daysOff: dto.daysOff,
      cidCode: dto.cidCode,
    });

    return this.prisma.certificate.create({
      data: {
        clinicId,
        patientId: dto.patientId,
        professionalId: dto.professionalId,
        type: dto.type,
        beneficiary,
        companionName: dto.companionName,
        visitDate,
        arrivalTime: dto.arrivalTime,
        departureTime: dto.departureTime,
        daysOff: dto.daysOff,
        cidCode: dto.cidCode,
        content,
      },
      include: { professional: { select: { croNumber: true, user: { select: { name: true } } } } },
    });
  }

  async remove(clinicId: string, id: string) {
    const certificate = await this.prisma.certificate.findFirst({ where: { id, clinicId } });
    if (!certificate) {
      throw new NotFoundException("Atestado não encontrado.");
    }
    await this.prisma.certificate.delete({ where: { id } });
  }

  /**
   * Sem nome/CRO nem qualquer texto de assinatura no conteúdo — o atestado sai
   * impresso em branco nessa parte de propósito, pra ser assinado e carimbado
   * fisicamente depois (decisão do usuário, não esquecer disso).
   */
  private buildContent(params: {
    clinicName: string;
    timeZone: string;
    type: "ATTENDANCE" | "MEDICAL";
    beneficiary: "PATIENT" | "COMPANION";
    patientName: string;
    companionName?: string;
    visitDate: Date;
    arrivalTime?: string;
    departureTime?: string;
    daysOff?: number;
    cidCode?: string;
  }) {
    const dataFormatada = formatDateBR(params.visitDate, params.timeZone);
    const beneficiaryName = params.beneficiary === "COMPANION" ? params.companionName! : params.patientName;
    const espacoParaAssinaturaECarimbo = ["", "", ""];

    if (params.type === "ATTENDANCE") {
      const periodo =
        params.arrivalTime && params.departureTime
          ? `, no período das ${params.arrivalTime} às ${params.departureTime},`
          : "";
      const contexto =
        params.beneficiary === "COMPANION"
          ? ` acompanhando o(a) paciente ${params.patientName} em atendimento odontológico`
          : " para atendimento odontológico";
      return [
        params.clinicName,
        "",
        "ATESTADO DE COMPARECIMENTO",
        "",
        `Atestamos, para os devidos fins, que ${beneficiaryName} esteve presente nesta clínica no dia ${dataFormatada}${periodo}${contexto}.`,
        ...espacoParaAssinaturaECarimbo,
      ].join("\n");
    }

    const contexto =
      params.beneficiary === "COMPANION"
        ? `, para acompanhar o(a) paciente ${params.patientName} em tratamento odontológico realizado nesta clínica`
        : ", em atendimento odontológico realizado nesta clínica,";
    const cid = params.cidCode ? `\nCID: ${params.cidCode}.` : "";
    return [
      params.clinicName,
      "",
      "ATESTADO MÉDICO",
      "",
      `Atestamos, para os devidos fins, que ${beneficiaryName} necessita de ${params.daysOff} dia(s) de afastamento de suas atividades a partir de ${dataFormatada}${contexto}.${cid}`,
      ...espacoParaAssinaturaECarimbo,
    ].join("\n");
  }
}
