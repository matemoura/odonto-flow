import { Injectable, NotFoundException } from "@nestjs/common";
import { OrthodonticStepStatus } from "@odontoflow/db";
import { PrismaService } from "../../database/prisma.service";
import { CreateTreatmentDto } from "./dto/create-treatment.dto";
import { AddStepDto } from "./dto/add-step.dto";
import { UpdateStepStatusDto } from "./dto/update-step-status.dto";
import { UpdateTreatmentStatusDto } from "./dto/update-treatment-status.dto";

const TREATMENT_INCLUDE = {
  professional: { select: { id: true, user: { select: { name: true } } } },
  steps: { orderBy: { sequence: "asc" as const } },
};

@Injectable()
export class OrthodonticsService {
  constructor(private readonly prisma: PrismaService) {}

  listForPatient(clinicId: string, patientId: string) {
    return this.prisma.orthodonticTreatment.findMany({
      where: { clinicId, patientId },
      include: TREATMENT_INCLUDE,
      orderBy: { startedAt: "desc" },
    });
  }

  async getOne(clinicId: string, id: string) {
    const treatment = await this.prisma.orthodonticTreatment.findFirst({
      where: { id, clinicId },
      include: TREATMENT_INCLUDE,
    });
    if (!treatment) {
      throw new NotFoundException("Tratamento ortodôntico não encontrado.");
    }
    return treatment;
  }

  async create(clinicId: string, dto: CreateTreatmentDto) {
    const professional = await this.prisma.professional.findFirst({
      where: { id: dto.professionalId, clinicId },
    });
    if (!professional) {
      throw new NotFoundException("Profissional não encontrado.");
    }

    return this.prisma.orthodonticTreatment.create({
      data: {
        clinicId,
        patientId: dto.patientId,
        professionalId: dto.professionalId,
        applianceType: dto.applianceType,
        startedAt: new Date(dto.startedAt),
        notes: dto.notes,
        steps: dto.steps?.length
          ? {
              create: dto.steps.map((step, index) => ({
                sequence: index + 1,
                description: step.description,
                scheduledFor: step.scheduledFor ? new Date(step.scheduledFor) : undefined,
              })),
            }
          : undefined,
      },
      include: TREATMENT_INCLUDE,
    });
  }

  async addStep(clinicId: string, treatmentId: string, dto: AddStepDto) {
    const treatment = await this.prisma.orthodonticTreatment.findFirst({
      where: { id: treatmentId, clinicId },
      include: { steps: { select: { sequence: true }, orderBy: { sequence: "desc" }, take: 1 } },
    });
    if (!treatment) {
      throw new NotFoundException("Tratamento ortodôntico não encontrado.");
    }

    const nextSequence = (treatment.steps[0]?.sequence ?? 0) + 1;
    await this.prisma.orthodonticStep.create({
      data: {
        treatmentId,
        sequence: nextSequence,
        description: dto.description,
        scheduledFor: dto.scheduledFor ? new Date(dto.scheduledFor) : undefined,
      },
    });
    return this.getOne(clinicId, treatmentId);
  }

  async updateStepStatus(clinicId: string, stepId: string, dto: UpdateStepStatusDto) {
    const step = await this.prisma.orthodonticStep.findFirst({
      where: { id: stepId, treatment: { clinicId } },
      include: { treatment: true },
    });
    if (!step) {
      throw new NotFoundException("Etapa não encontrada.");
    }

    await this.prisma.orthodonticStep.update({
      where: { id: stepId },
      data: {
        status: dto.status,
        completedAt: dto.status === OrthodonticStepStatus.DONE ? new Date() : null,
      },
    });
    return this.getOne(clinicId, step.treatmentId);
  }

  async updateTreatmentStatus(clinicId: string, treatmentId: string, dto: UpdateTreatmentStatusDto) {
    const treatment = await this.prisma.orthodonticTreatment.findFirst({ where: { id: treatmentId, clinicId } });
    if (!treatment) {
      throw new NotFoundException("Tratamento ortodôntico não encontrado.");
    }
    await this.prisma.orthodonticTreatment.update({ where: { id: treatmentId }, data: { status: dto.status } });
    return this.getOne(clinicId, treatmentId);
  }
}
