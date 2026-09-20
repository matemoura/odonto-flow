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
    const transaction = await this.prisma.transaction.findFirst({
      where: { id: transactionId, clinicId },
      // `select` no paciente: `include` traria a ficha inteira (RG, endereço,
      // contato de emergência) para uma emissão de nota.
      include: { patient: { select: { cpf: true, name: true } } },
    });
    if (!transaction) {
      throw new NotFoundException("Lançamento não encontrado.");
    }
    if (transaction.type !== "INCOME") {
      throw new BadRequestException("Só é possível emitir nota para uma receita.");
    }
    if (!transaction.paidAt) {
      throw new BadRequestException("Marque o lançamento como pago antes de emitir a nota.");
    }
    // Antes daqui existir, a nota saía com o CPF fixo "00000000000" — porque o
    // lançamento não sabia de quem era o dinheiro. Emitir documento fiscal com
    // CPF inventado é pior do que não emitir.
    if (!transaction.patient?.cpf) {
      throw new BadRequestException(
        "A nota precisa do CPF do paciente. Vincule o lançamento a um paciente com CPF cadastrado.",
      );
    }

    const existing = await this.prisma.invoice.findUnique({ where: { transactionId } });
    if (existing) {
      return existing;
    }

    const result = await this.nfe.issueServiceInvoice(clinicId, {
      transactionId,
      amountCents: transaction.amountCents,
      description: transaction.category,
      // CPF do tomador, agora que o lançamento sabe de quem é. Sem paciente
      // vinculado (despesa, receita avulsa) não há como emitir em nome de
      // ninguém — recusar é melhor do que emitir com documento falso.
      customerDocument: transaction.patient.cpf,
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
