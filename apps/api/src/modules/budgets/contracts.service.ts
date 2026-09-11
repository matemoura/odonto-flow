import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { ESignatureGatewayService } from "../integrations/e-signature-gateway.service";

function centsToBRL(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

@Injectable()
export class ContractsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eSignature: ESignatureGatewayService,
  ) {}

  getForBudget(clinicId: string, budgetId: string) {
    return this.prisma.contract.findFirst({ where: { clinicId, budgetId }, orderBy: { createdAt: "desc" } });
  }

  /** Gera o contrato/termo de consentimento e já manda assinar (mock assina na hora). */
  async generateForBudget(clinicId: string, budgetId: string) {
    const budget = await this.prisma.budget.findFirst({
      where: { id: budgetId, clinicId },
      include: { patient: true, items: { include: { procedure: true } } },
    });
    if (!budget) {
      throw new NotFoundException("Orçamento não encontrado.");
    }
    if (budget.status !== "APPROVED") {
      throw new BadRequestException("Só é possível gerar contrato para orçamentos aprovados.");
    }

    const linhas = budget.items
      .map((item) => `- ${item.procedure.name} x${item.quantity}: ${centsToBRL(item.unitPriceCents * item.quantity)}`)
      .join("\n");
    const total = budget.items.reduce((sum, item) => sum + item.unitPriceCents * item.quantity, 0);

    const content = [
      `TERMO DE CONSENTIMENTO E ORÇAMENTO — ${budget.patient.name}`,
      "",
      "Procedimentos aprovados:",
      linhas,
      "",
      `Total: ${centsToBRL(total)}`,
      "",
      "Declaro estar ciente dos procedimentos, riscos e valores acima descritos.",
    ].join("\n");

    const envelope = await this.eSignature.createEnvelope(clinicId, {
      patientId: budget.patientId,
      documentName: `Termo de consentimento — ${budget.patient.name}`,
      documentContent: content,
      signerName: budget.patient.name,
      signerEmail: budget.patient.email ?? `${budget.patientId}@sem-email.invalido`,
    });

    return this.prisma.contract.create({
      data: {
        clinicId,
        patientId: budget.patientId,
        budgetId: budget.id,
        provider: "mock",
        content,
        status: envelope.status === "signed" ? "SIGNED" : "PENDING",
        externalEnvelopeId: envelope.externalEnvelopeId,
        signedAt: envelope.signedAt,
      },
    });
  }
}
