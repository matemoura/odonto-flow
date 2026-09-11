import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { CreditScoreGatewayService } from "../integrations/credit-score-gateway.service";

@Injectable()
export class CreditScoreService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly creditScore: CreditScoreGatewayService,
  ) {}

  getLatest(clinicId: string, patientId: string) {
    return this.prisma.creditScoreQuery.findFirst({
      where: { clinicId, patientId },
      orderBy: { queriedAt: "desc" },
    });
  }

  /** Exige consentimento explícito no momento da consulta — nunca reutiliza um consentimento antigo (LGPD). */
  async query(clinicId: string, patientId: string, consentGiven: boolean) {
    if (!consentGiven) {
      throw new BadRequestException("É necessário o consentimento do paciente para consultar o score.");
    }

    const patient = await this.prisma.patient.findFirst({ where: { id: patientId, clinicId } });
    if (!patient) {
      throw new NotFoundException("Paciente não encontrado.");
    }
    if (!patient.cpf) {
      throw new BadRequestException("Cadastre o CPF do paciente antes de consultar o score.");
    }

    const consentGivenAt = new Date();
    const result = await this.creditScore.queryScore(clinicId, {
      patientId,
      patientCpf: patient.cpf,
      consentGivenAt,
    });

    return this.prisma.creditScoreQuery.create({
      data: {
        clinicId,
        patientId,
        provider: "mock",
        score: result.score,
        riskBand: result.riskBand,
        consentGivenAt,
      },
    });
  }
}
