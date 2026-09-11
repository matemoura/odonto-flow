import { Injectable, NotFoundException } from "@nestjs/common";
import { PaymentMethod } from "@odontoflow/db";
import { PrismaService } from "../../database/prisma.service";
import { zonedPeriodBoundsUtc } from "../scheduling/timezone.util";
import { CreateTransactionDto } from "./dto/create-transaction.dto";
import { UpsertCommissionRuleDto } from "./dto/upsert-commission-rule.dto";

const UM_DIA_MS = 24 * 60 * 60 * 1000;

/**
 * Divide um total em N parcelas sem perder nem criar centavo: o resto da
 * divisão é distribuído nas primeiras parcelas. 100,00 em 3x = 33,34 + 33,33 + 33,33.
 */
export function dividirEmParcelas(totalCents: number, parcelas: number): number[] {
  const base = Math.floor(totalCents / parcelas);
  const resto = totalCents - base * parcelas;
  return Array.from({ length: parcelas }, (_, i) => base + (i < resto ? 1 : 0));
}

/** Soma meses prendendo no último dia do mês alvo: 31/01 + 1 mês = 28/02, nunca 03/03. */
export function somarMeses(data: Date, meses: number): Date {
  const d = new Date(data.getTime());
  const dia = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + meses);
  const ultimoDiaDoMes = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(dia, ultimoDiaDoMes));
  return d;
}

@Injectable()
export class FinanceService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Fuso da clínica. O período de um relatório é sempre lido nele, nunca no
   * fuso do processo — a API roda em UTC em produção e o deslocamento
   * apareceria nas bordas de todo total.
   */
  private async getTimezone(clinicId: string): Promise<string> {
    const clinic = await this.prisma.clinic.findUniqueOrThrow({
      where: { id: clinicId },
      select: { timezone: true },
    });
    return clinic.timezone;
  }

  async listTransactions(clinicId: string, from: string, to: string) {
    const { start, end } = zonedPeriodBoundsUtc(from, to, await this.getTimezone(clinicId));
    return this.prisma.transaction.findMany({
      where: { clinicId, dueDate: { gte: start, lte: end } },
      include: {
        professional: { select: { id: true, user: { select: { name: true } } } },
        invoice: { select: { status: true } },
      },
      orderBy: { dueDate: "asc" },
    });
  }

  async getCashFlowSummary(clinicId: string, from: string, to: string) {
    const transactions = await this.listTransactions(clinicId, from, to);
    const agora = new Date();

    let totalIncomeCents = 0;
    let totalFeesCents = 0;
    let settledIncomeCents = 0;
    let pendingSettlementCents = 0;
    let totalExpenseCents = 0;
    let pendingIncomeCents = 0;
    let pendingExpenseCents = 0;

    for (const t of transactions) {
      if (t.type === "INCOME") {
        if (t.paidAt) {
          totalIncomeCents += t.amountCents;
          totalFeesCents += t.feeCents;
          const liquido = t.amountCents - t.feeCents;
          // Sem settledAt (lançamento quitado antes deste campo existir) conta
          // como já compensado — era o comportamento efetivo na época.
          if (!t.settledAt || t.settledAt <= agora) settledIncomeCents += liquido;
          else pendingSettlementCents += liquido;
        } else {
          pendingIncomeCents += t.amountCents;
        }
      } else {
        if (t.paidAt) totalExpenseCents += t.amountCents;
        else pendingExpenseCents += t.amountCents;
      }
    }

    const netIncomeCents = totalIncomeCents - totalFeesCents;

    return {
      totalIncomeCents,
      totalFeesCents,
      netIncomeCents,
      settledIncomeCents,
      pendingSettlementCents,
      totalExpenseCents,
      // saldo passa a usar o líquido: é o que de fato sobrou para a clínica
      balanceCents: netIncomeCents - totalExpenseCents,
      pendingIncomeCents,
      pendingExpenseCents,
    };
  }

  /**
   * Cria o lançamento. Com `installments > 1`, o valor informado é o TOTAL e
   * vira N lançamentos mensais — é assim que a clínica pensa ("tratamento de
   * R$ 5.000 em 10x"), então quem divide é o sistema, não a recepção.
   */
  async create(clinicId: string, dto: CreateTransactionDto) {
    const parcelas = dto.installments ?? 1;
    const incluirProfissional = {
      professional: { select: { id: true, user: { select: { name: true } } } },
    };

    if (parcelas <= 1) {
      return this.prisma.transaction.create({
        data: {
          clinicId,
          type: dto.type,
          category: dto.category,
          description: dto.description,
          amountCents: dto.amountCents,
          dueDate: new Date(dto.dueDate),
          professionalId: dto.professionalId,
        },
        include: incluirProfissional,
      });
    }

    const valores = dividirEmParcelas(dto.amountCents, parcelas);
    const primeiroVencimento = new Date(dto.dueDate);

    const criados = await this.prisma.$transaction(
      valores.map((valor, i) =>
        this.prisma.transaction.create({
          data: {
            clinicId,
            type: dto.type,
            category: dto.category,
            description: dto.description,
            amountCents: valor,
            dueDate: somarMeses(primeiroVencimento, i),
            professionalId: dto.professionalId,
            installmentNumber: i + 1,
            installmentTotal: parcelas,
          },
          include: incluirProfissional,
        }),
      ),
    );

    return criados[0];
  }

  async getCardSettings(clinicId: string) {
    return this.prisma.clinic.findUniqueOrThrow({
      where: { id: clinicId },
      select: { cardFeeBasisPoints: true, cardSettlementDays: true },
    });
  }

  async updateCardSettings(clinicId: string, dto: { cardFeeBasisPoints: number; cardSettlementDays: number }) {
    return this.prisma.clinic.update({
      where: { id: clinicId },
      data: { cardFeeBasisPoints: dto.cardFeeBasisPoints, cardSettlementDays: dto.cardSettlementDays },
      select: { cardFeeBasisPoints: true, cardSettlementDays: true },
    });
  }

  /**
   * Marca a transação como paga e, se for receita ligada a um profissional
   * com CommissionRule cadastrada, gera o CommissionEntry automaticamente
   * (comissionamento automático — ver plano, Fase 2).
   */
  async markPaid(clinicId: string, id: string, paymentMethod: PaymentMethod) {
    const transaction = await this.prisma.transaction.findFirst({ where: { id, clinicId } });
    if (!transaction) {
      throw new NotFoundException("Lançamento não encontrado.");
    }
    if (transaction.paidAt) {
      return transaction;
    }

    // Taxa e prazo são da maquininha da clínica: valem só para dinheiro
    // ENTRANDO no cartão. Despesa paga no cartão não tem taxa retida da
    // clínica, e o prazo ali seria a fatura do cartão — outro assunto.
    const clinic = await this.prisma.clinic.findUniqueOrThrow({
      where: { id: clinicId },
      select: { cardFeeBasisPoints: true, cardSettlementDays: true },
    });
    const recebimentoNoCartao = paymentMethod === "CARD" && transaction.type === "INCOME";
    const agora = new Date();
    const feeCents = recebimentoNoCartao
      ? Math.round((transaction.amountCents * clinic.cardFeeBasisPoints) / 10000)
      : 0;
    const settledAt = recebimentoNoCartao
      ? new Date(agora.getTime() + clinic.cardSettlementDays * UM_DIA_MS)
      : agora;

    const updated = await this.prisma.transaction.update({
      where: { id },
      data: { paidAt: agora, paymentMethod, feeCents, settledAt },
      include: { professional: { select: { id: true, user: { select: { name: true } } } } },
    });

    if (updated.type === "INCOME" && updated.professionalId) {
      const rule = await this.prisma.commissionRule.findUnique({
        where: { professionalId: updated.professionalId },
      });
      if (rule) {
        await this.prisma.commissionEntry.upsert({
          where: { transactionId: id },
          update: {},
          create: {
            clinicId,
            professionalId: updated.professionalId,
            transactionId: id,
            amountCents: Math.round((updated.amountCents * rule.percentageBasisPoints) / 10000),
          },
        });
      }
    }

    return updated;
  }

  listCommissionRules(clinicId: string) {
    return this.prisma.commissionRule.findMany({
      where: { clinicId },
      include: { professional: { select: { id: true, user: { select: { name: true } } } } },
    });
  }

  upsertCommissionRule(clinicId: string, professionalId: string, dto: UpsertCommissionRuleDto) {
    return this.prisma.commissionRule.upsert({
      where: { professionalId },
      update: { percentageBasisPoints: dto.percentageBasisPoints },
      create: { clinicId, professionalId, percentageBasisPoints: dto.percentageBasisPoints },
    });
  }

  async listCommissionEntries(clinicId: string, from: string, to: string) {
    const { start, end } = zonedPeriodBoundsUtc(from, to, await this.getTimezone(clinicId));
    return this.prisma.commissionEntry.findMany({
      where: { clinicId, createdAt: { gte: start, lte: end } },
      include: {
        professional: { select: { user: { select: { name: true } } } },
        transaction: { select: { category: true, dueDate: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }
}
