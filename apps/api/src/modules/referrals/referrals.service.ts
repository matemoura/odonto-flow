import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { CreateReferralDto } from "./dto/create-referral.dto";
import { UpdateReferralStatusDto } from "./dto/update-referral-status.dto";

@Injectable()
export class ReferralsService {
  constructor(private readonly prisma: PrismaService) {}

  list(clinicId: string) {
    return this.prisma.referral.findMany({
      where: { clinicId },
      include: {
        referrerPatient: { select: { id: true, name: true } },
        referredPatient: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async create(clinicId: string, dto: CreateReferralDto) {
    const referrer = await this.prisma.patient.findFirst({
      where: { id: dto.referrerPatientId, clinicId },
    });
    if (!referrer) {
      throw new NotFoundException("Paciente indicador não encontrado.");
    }
    return this.prisma.referral.create({
      data: {
        clinicId,
        referrerPatientId: dto.referrerPatientId,
        referredName: dto.referredName,
        referredPhone: dto.referredPhone,
      },
      include: { referrerPatient: { select: { id: true, name: true } } },
    });
  }

  async updateStatus(clinicId: string, id: string, dto: UpdateReferralStatusDto) {
    const referral = await this.prisma.referral.findFirst({ where: { id, clinicId } });
    if (!referral) {
      throw new NotFoundException("Indicação não encontrada.");
    }
    return this.prisma.referral.update({
      where: { id },
      data: {
        status: dto.status,
        referredPatientId: dto.referredPatientId,
        rewardGranted: dto.rewardGranted,
      },
      include: {
        referrerPatient: { select: { id: true, name: true } },
        referredPatient: { select: { id: true, name: true } },
      },
    });
  }
}
