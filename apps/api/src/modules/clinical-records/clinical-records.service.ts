import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { assertAgendamentoDoPaciente, assertPacienteDaClinica } from "../../common/scope/tenant-scope.util";
import { CreateClinicalRecordDto } from "./dto/create-clinical-record.dto";
import { UpsertOdontogramEntryDto } from "./dto/upsert-odontogram-entry.dto";
import { UpsertPeriodontalEntryDto } from "./dto/upsert-periodontal-entry.dto";
import { UpsertAnamnesisDto } from "./dto/upsert-anamnesis.dto";
import { CreateTreatmentPlanOptionDto } from "./dto/create-treatment-plan-option.dto";
import { UpdateTreatmentPlanOptionDto } from "./dto/update-treatment-plan-option.dto";
import { CreateTreatmentPlanOptionItemDto } from "./dto/create-treatment-plan-option-item.dto";
import { UpdateTreatmentPlanOptionItemDto } from "./dto/update-treatment-plan-option-item.dto";

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
    await assertPacienteDaClinica(this.prisma, clinicId, dto.patientId);
    if (dto.appointmentId) {
      await assertAgendamentoDoPaciente(this.prisma, clinicId, dto.patientId, dto.appointmentId);
    }

    // O timestamp da assinatura é sempre o relógio do servidor, nunca algo que
    // o cliente possa mandar — senão dava para forjar "assinado às 3h da manhã".
    const now = new Date();
    return this.prisma.clinicalRecord.create({
      data: {
        clinicId,
        patientId: dto.patientId,
        professionalId: professional.id,
        appointmentId: dto.appointmentId,
        type: dto.type,
        content: dto.content,
        professionalSignature: dto.professionalSignature,
        professionalSignedAt: dto.professionalSignature ? now : undefined,
        patientSignature: dto.patientSignature,
        patientSignedAt: dto.patientSignature ? now : undefined,
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
    await assertPacienteDaClinica(this.prisma, clinicId, dto.patientId);
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
    await assertPacienteDaClinica(this.prisma, clinicId, patientId);
    return this.prisma.periodontalEntry.create({
      data: { clinicId, patientId, toothNumber, ...fields, updatedBy: actorUserId },
    });
  }

  async getAnamnesis(clinicId: string, patientId: string) {
    return this.prisma.anamnesis.findFirst({ where: { clinicId, patientId } });
  }

  async upsertAnamnesis(clinicId: string, actorUserId: string, dto: UpsertAnamnesisDto) {
    await this.assertProfessional(clinicId, actorUserId);
    const { patientId, treatmentConsent, imageUseConsent, consentSignature, ...fields } = dto;
    // `Anamnesis.patientId` é único GLOBAL, então o upsert abaixo alcança a
    // linha de qualquer clínica. Sem esta checagem ele devolvia (e regravava)
    // o prontuário de paciente de outra clínica.
    await assertPacienteDaClinica(this.prisma, clinicId, patientId);

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

    // A assinatura só é regravada quando o paciente desenha uma nova — resalvar
    // a ficha sem tocar no traço preserva a que já estava lá, em vez de apagá-la.
    const signatureFields = consentSignature
      ? { consentSignature, consentSignedAt: existing?.consentSignedAt ?? new Date() }
      : {};

    return this.prisma.anamnesis.upsert({
      where: { patientId },
      update: { ...fields, ...consentTimestamps, ...signatureFields },
      create: { clinicId, patientId, ...fields, ...consentTimestamps, ...signatureFields },
    });
  }

  private readonly TREATMENT_PLAN_OPTION_INCLUDE = {
    professional: { select: { user: { select: { name: true } } } },
    items: { include: { procedure: true } },
  } as const;

  listTreatmentPlanOptions(clinicId: string, patientId: string) {
    return this.prisma.treatmentPlanOption.findMany({
      where: { clinicId, patientId },
      include: this.TREATMENT_PLAN_OPTION_INCLUDE,
      orderBy: { createdAt: "asc" },
    });
  }

  async createTreatmentPlanOption(clinicId: string, dto: CreateTreatmentPlanOptionDto) {
    await assertPacienteDaClinica(this.prisma, clinicId, dto.patientId);
    return this.prisma.treatmentPlanOption.create({
      data: { clinicId, ...dto },
      include: this.TREATMENT_PLAN_OPTION_INCLUDE,
    });
  }

  async updateTreatmentPlanOption(clinicId: string, id: string, dto: UpdateTreatmentPlanOptionDto) {
    await this.assertTreatmentPlanOptionExists(clinicId, id);
    return this.prisma.treatmentPlanOption.update({
      where: { id },
      data: dto,
      include: this.TREATMENT_PLAN_OPTION_INCLUDE,
    });
  }

  async removeTreatmentPlanOption(clinicId: string, id: string) {
    await this.assertTreatmentPlanOptionExists(clinicId, id);
    await this.prisma.treatmentPlanOption.delete({ where: { id } });
  }

  /** Vincula um serviço cadastrado à opção — mesmo padrão do BudgetItem (preço vem do serviço se não informado). */
  async addTreatmentPlanOptionItem(clinicId: string, optionId: string, dto: CreateTreatmentPlanOptionItemDto) {
    await this.assertTreatmentPlanOptionExists(clinicId, optionId);
    const procedure = await this.prisma.procedure.findFirst({ where: { id: dto.procedureId, clinicId } });
    if (!procedure) {
      throw new NotFoundException("Serviço não encontrado.");
    }
    await this.prisma.treatmentPlanOptionItem.create({
      data: {
        treatmentPlanOptionId: optionId,
        procedureId: dto.procedureId,
        quantity: dto.quantity ?? 1,
        unitPriceCents: dto.unitPriceCents ?? procedure.defaultPriceCents,
      },
    });
    return this.prisma.treatmentPlanOption.findFirst({
      where: { id: optionId },
      include: this.TREATMENT_PLAN_OPTION_INCLUDE,
    });
  }

  async updateTreatmentPlanOptionItem(
    clinicId: string,
    optionId: string,
    itemId: string,
    dto: UpdateTreatmentPlanOptionItemDto,
  ) {
    await this.assertTreatmentPlanOptionItemExists(clinicId, optionId, itemId);
    await this.prisma.treatmentPlanOptionItem.update({ where: { id: itemId }, data: dto });
    return this.prisma.treatmentPlanOption.findFirst({
      where: { id: optionId },
      include: this.TREATMENT_PLAN_OPTION_INCLUDE,
    });
  }

  async removeTreatmentPlanOptionItem(clinicId: string, optionId: string, itemId: string) {
    await this.assertTreatmentPlanOptionItemExists(clinicId, optionId, itemId);
    await this.prisma.treatmentPlanOptionItem.delete({ where: { id: itemId } });
    return this.prisma.treatmentPlanOption.findFirst({
      where: { id: optionId },
      include: this.TREATMENT_PLAN_OPTION_INCLUDE,
    });
  }

  private async assertTreatmentPlanOptionExists(clinicId: string, id: string) {
    const option = await this.prisma.treatmentPlanOption.findFirst({ where: { id, clinicId } });
    if (!option) {
      throw new NotFoundException("Opção de plano de tratamento não encontrada.");
    }
    return option;
  }

  private async assertTreatmentPlanOptionItemExists(clinicId: string, optionId: string, itemId: string) {
    const item = await this.prisma.treatmentPlanOptionItem.findFirst({
      where: { id: itemId, treatmentPlanOptionId: optionId, treatmentPlanOption: { clinicId } },
    });
    if (!item) {
      throw new NotFoundException("Serviço não encontrado nesta opção do plano de tratamento.");
    }
    return item;
  }
}
