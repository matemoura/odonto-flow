import { Injectable, NotFoundException } from "@nestjs/common";
import type { RiskFlag } from "@odontoflow/db";
import { PrismaService } from "../../database/prisma.service";
import { assertAgendamentoDoPaciente, assertPacienteDaClinica } from "../../common/scope/tenant-scope.util";
import { CreatePrescriptionDto } from "./dto/create-prescription.dto";

/** Mesma lista de flags marcadas na anamnese do paciente, na forma do enum `RiskFlag`. */
function riskFlagsFromAnamnesis(anamnesis: {
  hasHypertension: boolean;
  hasDiabetes: boolean;
  hasHeartCondition: boolean;
  hasBleedingDisorder: boolean;
  isPregnant: boolean;
  hasChronicKidneyDisease: boolean;
  hasCancerOrImmunosuppression: boolean;
} | null): RiskFlag[] {
  if (!anamnesis) return [];
  const flags: RiskFlag[] = [];
  if (anamnesis.hasHypertension) flags.push("HYPERTENSION");
  if (anamnesis.hasDiabetes) flags.push("DIABETES");
  if (anamnesis.hasHeartCondition) flags.push("HEART_CONDITION");
  if (anamnesis.hasBleedingDisorder) flags.push("BLEEDING_DISORDER");
  if (anamnesis.isPregnant) flags.push("PREGNANT");
  if (anamnesis.hasChronicKidneyDisease) flags.push("CHRONIC_KIDNEY_DISEASE");
  if (anamnesis.hasCancerOrImmunosuppression) flags.push("CANCER_OR_IMMUNOSUPPRESSION");
  return flags;
}

const RISK_FLAG_LABEL: Record<RiskFlag, string> = {
  HYPERTENSION: "hipertensão",
  DIABETES: "diabetes",
  HEART_CONDITION: "problema cardíaco",
  BLEEDING_DISORDER: "distúrbio de coagulação",
  PREGNANT: "gestante",
  CHRONIC_KIDNEY_DISEASE: "insuficiência renal crônica",
  CANCER_OR_IMMUNOSUPPRESSION: "câncer/imunossupressão",
};

@Injectable()
export class PrescriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Mesma checagem de `ClinicalRecordsService` — quem assina uma receita
   * precisa ser um profissional de verdade vinculado à clínica, nunca um
   * admin que só faz gestão.
   */
  private async assertProfessional(clinicId: string, userId: string) {
    const professional = await this.prisma.professional.findFirst({
      where: { clinicId, userId },
      include: { user: { select: { name: true } } },
    });
    if (!professional) {
      throw new NotFoundException("Só um profissional vinculado a esta clínica pode emitir receita.");
    }
    return professional;
  }

  listMedications() {
    return this.prisma.medication.findMany({
      include: { riskNotes: true },
      orderBy: [{ class: "asc" }, { name: "asc" }],
    });
  }

  listForPatient(clinicId: string, patientId: string) {
    return this.prisma.prescription.findMany({
      where: { clinicId, patientId },
      include: { items: { orderBy: { order: "asc" } }, professional: { select: { user: { select: { name: true } } } } },
      orderBy: { createdAt: "desc" },
    });
  }

  /** Usado pela página de impressão — só precisa do id, sem depender do patientId na rota. */
  async findOne(clinicId: string, id: string) {
    const prescription = await this.prisma.prescription.findFirst({
      where: { id, clinicId },
      include: {
        items: { orderBy: { order: "asc" } },
        professional: { select: { croNumber: true, user: { select: { name: true } } } },
      },
    });
    if (!prescription) {
      throw new NotFoundException("Receita não encontrada.");
    }
    return prescription;
  }

  async create(clinicId: string, actorUserId: string, dto: CreatePrescriptionDto) {
    const professional = await this.assertProfessional(clinicId, actorUserId);
    await assertPacienteDaClinica(this.prisma, clinicId, dto.patientId);
    if (dto.appointmentId) {
      await assertAgendamentoDoPaciente(this.prisma, clinicId, dto.patientId, dto.appointmentId);
    }

    const [patient, clinic, anamnesis, procedure] = await Promise.all([
      this.prisma.patient.findUniqueOrThrow({ where: { id: dto.patientId } }),
      this.prisma.clinic.findUniqueOrThrow({ where: { id: clinicId } }),
      this.prisma.anamnesis.findUnique({ where: { patientId: dto.patientId } }),
      dto.procedureId
        ? this.prisma.procedure.findFirst({ where: { id: dto.procedureId, clinicId } })
        : Promise.resolve(null),
    ]);
    if (dto.procedureId && !procedure) {
      throw new NotFoundException("Serviço não encontrado nesta clínica.");
    }

    const medicationIds = dto.items.map((item) => item.medicationId).filter((id): id is string => !!id);
    const medications = medicationIds.length
      ? await this.prisma.medication.findMany({
          where: { id: { in: medicationIds } },
          include: { riskNotes: true },
        })
      : [];
    const medicationById = new Map(medications.map((m) => [m.id, m]));

    const patientRiskFlags = new Set(riskFlagsFromAnamnesis(anamnesis));
    const warnings: string[] = [];

    const items = dto.items.map((item, index) => {
      const medication = item.medicationId ? medicationById.get(item.medicationId) : undefined;
      if (item.medicationId && !medication) {
        throw new NotFoundException("Medicamento não encontrado no catálogo.");
      }
      const medicationName = medication?.name ?? item.customName!;

      if (medication) {
        for (const riskNote of medication.riskNotes) {
          if (patientRiskFlags.has(riskNote.riskFlag)) {
            const prefixo = riskNote.severity === "AVOID" ? "Evitar" : "Cautela";
            warnings.push(
              `${prefixo}: ${medicationName} — paciente com ${RISK_FLAG_LABEL[riskNote.riskFlag]}. ${riskNote.note}`,
            );
          }
        }
      }

      return {
        medicationName,
        posology: item.posology,
        instructions: item.instructions,
        order: index,
      };
    });

    const content = this.buildContent({
      clinicName: clinic.name,
      patientName: patient.name,
      professionalName: professional.user.name,
      croNumber: professional.croNumber,
      items,
      notes: dto.notes,
    });

    return this.prisma.prescription.create({
      data: {
        clinicId,
        patientId: dto.patientId,
        professionalId: professional.id,
        appointmentId: dto.appointmentId,
        procedureId: dto.procedureId,
        notes: dto.notes,
        riskWarningsShown: warnings.length ? warnings.join("\n") : undefined,
        content,
        items: { create: items },
      },
      include: {
        items: { orderBy: { order: "asc" } },
        professional: { select: { croNumber: true, user: { select: { name: true } } } },
      },
    });
  }

  /**
   * Diferente do Certificate (que sai sem nome/CRO de propósito, pra assinatura
   * física depois): aqui identificar quem prescreveu é o próprio ponto da
   * receita — sem isso não é um documento válido. Nome e CRO vão sempre.
   */
  private buildContent(params: {
    clinicName: string;
    patientName: string;
    professionalName: string;
    croNumber: string | null;
    items: { medicationName: string; posology: string; instructions?: string }[];
    notes?: string;
  }) {
    const linhasItens = params.items.flatMap((item, index) => {
      const linhas = [`${index + 1}. ${item.medicationName} — ${item.posology}`];
      if (item.instructions) linhas.push(`   ${item.instructions}`);
      return linhas;
    });

    return [
      params.clinicName,
      "",
      "RECEITUÁRIO",
      "",
      `Paciente: ${params.patientName}`,
      "",
      ...linhasItens,
      ...(params.notes ? ["", params.notes] : []),
      "",
      "",
      params.professionalName,
      params.croNumber ? `CRO ${params.croNumber}` : "",
    ].join("\n");
  }
}
