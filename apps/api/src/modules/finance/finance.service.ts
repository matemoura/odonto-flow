import { Injectable, NotFoundException } from "@nestjs/common";
import { PaymentMethod } from "@odontoflow/db";
import { PrismaService } from "../../database/prisma.service";
import { zonedPeriodBoundsUtc } from "../scheduling/timezone.util";
import { assertProfissionalDaClinica } from "../../common/scope/tenant-scope.util";
import { dividirEmParcelas, somarMeses } from "./parcelamento.util";
import { CreateTransactionDto } from "./dto/create-transaction.dto";
import { UpsertCommissionRuleDto } from "./dto/upsert-commission-rule.dto";

const UM_DIA_MS = 24 * 60 * 60 * 1000;

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

  async upsertCommissionRule(clinicId: string, professionalId: string, dto: UpsertCommissionRuleDto) {
    // `CommissionRule.professionalId` é único GLOBAL e o id vem do path, que o
    // TenantGuard não olha: sem esta linha, o ramo `update` reescrevia a
    // comissão de um profissional de outra clínica.
    await assertProfissionalDaClinica(this.prisma, clinicId, professionalId);
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
        professional: { select: { id: true, user: { select: { name: true } } } },
        // `select` e não `include`: a linha inteira de Transaction não é
        // necessária aqui, e a de Patient traria CPF, RG e endereço.
        transaction: {
          select: {
            category: true,
            dueDate: true,
            paidAt: true,
            amountCents: true,
            patient: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Fechamento de comissão do período: quanto cada profissional tem a receber.
   *
   * A comissão era calculada e acumulada desde a Fase 2, e o endpoint de
   * listagem não tinha NENHUM consumidor — o único lugar onde ela aparecia era
   * um total agregado no ranking do Painel. Fechar o mês e pagar a Dra. X
   * exigia consultar o banco à mão.
   *
   * O período é filtrado por `createdAt` da entrada, que é o instante em que a
   * parcela foi QUITADA (a comissão nasce no `markPaid`). É o critério certo
   * para fechamento: comissão se paga sobre o que entrou, não sobre o que foi
   * prometido.
   */
  async getCommissionReport(clinicId: string, from: string, to: string) {
    const entries = await this.listCommissionEntries(clinicId, from, to);

    const porProfissional = new Map<string, { professionalId: string; nome: string; totalCents: number; quantidade: number }>();
    let totalCents = 0;

    for (const entry of entries) {
      totalCents += entry.amountCents;
      const chave = entry.professional.id;
      const atual = porProfissional.get(chave) ?? {
        professionalId: chave,
        nome: entry.professional.user.name,
        totalCents: 0,
        quantidade: 0,
      };
      atual.totalCents += entry.amountCents;
      atual.quantidade += 1;
      porProfissional.set(chave, atual);
    }

    return {
      totalCents,
      // Maior primeiro: quem tem mais a receber é o que a clínica precisa ver.
      porProfissional: [...porProfissional.values()].sort((a, b) => b.totalCents - a.totalCents),
      entries,
    };
  }
}
