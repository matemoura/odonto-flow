import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { CreateClinicalRecordDto } from "./dto/create-clinical-record.dto";
import { UpsertOdontogramEntryDto } from "./dto/upsert-odontogram-entry.dto";
import { UpsertPeriodontalEntryDto } from "./dto/upsert-periodontal-entry.dto";
import { UpsertAnamnesisDto } from "./dto/upsert-anamnesis.dto";
import { CreateTreatmentPlanOptionDto } from "./dto/create-treatment-plan-option.dto";
import { UpdateTreatmentPlanOptionDto } from "./dto/update-treatment-plan-option.dto";

@Injectable()
export class ClinicalRecordsService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertProfessional(clinicId: string, userId: string) {
    const professional = await this.prisma.professional.findFirst({ where: { clinicId, userId } });
    if (!professional) {
      throw new NotFoundException("Só um profissional vinculado a esta clínica pode registrar prontuário.");
    }
    return professional;
  }

  async listForPatient(clinicId: string, patientId: string) {
    return this.prisma.clinicalRecord.findMany({
      where: { clinicId, patientId },
      include: { professional: { select: { user: { select: { name: true } } } } },
      orderBy: { createdAt: "desc" },
    });
  }

  async create(clinicId: string, actorUserId: string, dto: CreateClinicalRecordDto) {
    const professional = await this.assertProfessional(clinicId, actorUserId);
    return this.prisma.clinicalRecord.create({
      data: {
        clinicId,
        patientId: dto.patientId,
        professionalId: professional.id,
        appointmentId: dto.appointmentId,
        type: dto.type,
        content: dto.content,
      },
    });
  }

  /** Estado atual do odontograma: a linha mais recente por dente. */
  async getOdontogram(clinicId: string, patientId: string) {
    const entries = await this.prisma.odontogram.findMany({
      where: { clinicId, patientId },
      orderBy: { updatedAt: "desc" },
    });

    const latestByTooth = new Map<number, (typeof entries)[number]>();
    for (const entry of entries) {
      if (!latestByTooth.has(entry.toothNumber)) {
        latestByTooth.set(entry.toothNumber, entry);
      }
    }
    return Array.from(latestByTooth.values()).sort((a, b) => a.toothNumber - b.toothNumber);
  }

  async upsertOdontogramEntry(clinicId: string, actorUserId: string, dto: UpsertOdontogramEntryDto) {
    await this.assertProfessional(clinicId, actorUserId);
    return this.prisma.odontogram.create({
      data: {
        clinicId,
        patientId: dto.patientId,
        toothNumber: dto.toothNumber,
        condition: dto.condition,
        faces: dto.faces,
        notes: dto.notes,
        updatedBy: actorUserId,
      },
    });
  }

  /** Estado atual do periograma: a linha mais recente por dente — mesmo padrão do odontograma. */
  async getPeriodontogram(clinicId: string, patientId: string) {
    const entries = await this.prisma.periodontalEntry.findMany({
      where: { clinicId, patientId },
      orderBy: { updatedAt: "desc" },
    });

    const latestByTooth = new Map<number, (typeof entries)[number]>();
    for (const entry of entries) {
      if (!latestByTooth.has(entry.toothNumber)) {
        latestByTooth.set(entry.toothNumber, entry);
      }
    }
    return Array.from(latestByTooth.values()).sort((a, b) => a.toothNumber - b.toothNumber);
  }

  async upsertPeriodontalEntry(clinicId: string, actorUserId: string, dto: UpsertPeriodontalEntryDto) {
    await this.assertProfessional(clinicId, actorUserId);
    const { patientId, toothNumber, ...fields } = dto;
    return this.prisma.periodontalEntry.create({
      data: { clinicId, patientId, toothNumber, ...fields, updatedBy: actorUserId },
    });
  }

  async getAnamnesis(clinicId: string, patientId: string) {
    return this.prisma.anamnesis.findFirst({ where: { clinicId, patientId } });
  }

  async upsertAnamnesis(clinicId: string, actorUserId: string, dto: UpsertAnamnesisDto) {
    await this.assertProfessional(clinicId, actorUserId);
    const { patientId, treatmentConsent, imageUseConsent, ...fields } = dto;

    const existing = await this.prisma.anamnesis.findUnique({ where: { patientId } });

    const consentTimestamps = {
      treatmentConsentAt:
        treatmentConsent === undefined
          ? undefined
          : treatmentConsent
            ? (existing?.treatmentConsentAt ?? new Date())
            : null,
      imageUseConsentAt:
        imageUseConsent === undefined
          ? undefined
          : imageUseConsent
            ? (existing?.imageUseConsentAt ?? new Date())
            : null,
    };

    return this.prisma.anamnesis.upsert({
      where: { patientId },
      update: { ...fields, ...consentTimestamps },
      create: { clinicId, patientId, ...fields, ...consentTimestamps },
    });
  }

  listTreatmentPlanOptions(clinicId: string, patientId: string) {
    return this.prisma.treatmentPlanOption.findMany({
      where: { clinicId, patientId },
      include: { professional: { select: { user: { select: { name: true } } } } },
      orderBy: { createdAt: "asc" },
    });
  }

  createTreatmentPlanOption(clinicId: string, dto: CreateTreatmentPlanOptionDto) {
    return this.prisma.treatmentPlanOption.create({
      data: { clinicId, ...dto },
      include: { professional: { select: { user: { select: { name: true } } } } },
    });
  }

  async updateTreatmentPlanOption(clinicId: string, id: string, dto: UpdateTreatmentPlanOptionDto) {
    await this.assertTreatmentPlanOptionExists(clinicId, id);
    return this.prisma.treatmentPlanOption.update({
      where: { id },
      data: dto,
      include: { professional: { select: { user: { select: { name: true } } } } },
    });
  }

  async removeTreatmentPlanOption(clinicId: string, id: string) {
    await this.assertTreatmentPlanOptionExists(clinicId, id);
    await this.prisma.treatmentPlanOption.delete({ where: { id } });
  }

  private async assertTreatmentPlanOptionExists(clinicId: string, id: string) {
    const option = await this.prisma.treatmentPlanOption.findFirst({ where: { id, clinicId } });
    if (!option) {
      throw new NotFoundException("Opção de plano de tratamento não encontrada.");
    }
    return option;
  }
}
