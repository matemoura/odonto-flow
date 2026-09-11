import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { NfeGatewayService } from "../integrations/nfe-gateway.service";

@Injectable()
export class InvoicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly nfe: NfeGatewayService,
  ) {}

  getForTransaction(clinicId: string, transactionId: string) {
    return this.prisma.invoice.findFirst({ where: { clinicId, transactionId } });
  }

  /** Emite a NFS-e de uma receita já paga. Cada clínica escolhe o provedor real depois (ver plano, preços). */
  async issueForTransaction(clinicId: string, transactionId: string) {
    const transaction = await this.prisma.transaction.findFirst({ where: { id: transactionId, clinicId } });
    if (!transaction) {
      throw new NotFoundException("Lançamento não encontrado.");
    }
    if (transaction.type !== "INCOME") {
      throw new BadRequestException("Só é possível emitir nota para uma receita.");
    }
    if (!transaction.paidAt) {
      throw new BadRequestException("Marque o lançamento como pago antes de emitir a nota.");
    }

    const existing = await this.prisma.invoice.findUnique({ where: { transactionId } });
    if (existing) {
      return existing;
    }

    const result = await this.nfe.issueServiceInvoice(clinicId, {
      transactionId,
      amountCents: transaction.amountCents,
      description: transaction.category,
      customerDocument: "00000000000", // CPF do tomador — ainda não coletado no fluxo de lançamento; ver "o que falta ligar"
    });

    return this.prisma.invoice.create({
      data: {
        clinicId,
        transactionId,
        provider: "mock",
        externalId: result.externalId,
        status: result.status === "issued" ? "ISSUED" : result.status === "processing" ? "PROCESSING" : "FAILED",
        pdfUrl: result.pdfUrl,
      },
    });
  }
}
