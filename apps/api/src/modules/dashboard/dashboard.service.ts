import { Injectable } from "@nestjs/common";
import { PaymentMethod } from "@odontoflow/db";
import { PrismaService } from "../../database/prisma.service";
import { getZonedParts, zonedPeriodBoundsUtc } from "../scheduling/timezone.util";

/** Chave "YYYY-MM" do mês civil no fuso da clínica — nunca no fuso do servidor. */
function mesNoFuso(date: Date, timeZone: string): string {
  const { year, month } = getZonedParts(date, timeZone);
  return `${year}-${String(month).padStart(2, "0")}`;
}

/** Lista de meses "YYYY-MM" entre dois instantes, inclusive, para o eixo do gráfico. */
function mesesDoPeriodo(start: Date, end: Date, timeZone: string): string[] {
  const inicio = getZonedParts(start, timeZone);
  const fim = getZonedParts(end, timeZone);
  const meses: string[] = [];
  let ano = inicio.year;
  let mes = inicio.month;
  while (ano < fim.year || (ano === fim.year && mes <= fim.month)) {
    meses.push(`${ano}-${String(mes).padStart(2, "0")}`);
    mes += 1;
    if (mes > 12) {
      mes = 1;
      ano += 1;
    }
  }
  return meses;
}

function pct(parte: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((parte / total) * 1000) / 10;
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(clinicId: string, from: string, to: string) {
    const clinic = await this.prisma.clinic.findUniqueOrThrow({
      where: { id: clinicId },
      select: { timezone: true },
    });
    const timeZone = clinic.timezone;
    const { start, end } = zonedPeriodBoundsUtc(from, to, timeZone);
    const meses = mesesDoPeriodo(start, end, timeZone);

    const [transactions, appointments, budgets, commissions, professionals] = await Promise.all([
      this.prisma.transaction.findMany({
        where: { clinicId, dueDate: { gte: start, lte: end } },
        select: {
          type: true,
          amountCents: true,
          feeCents: true,
          dueDate: true,
          paidAt: true,
          paymentMethod: true,
          professionalId: true,
        },
      }),
      this.prisma.appointment.findMany({
        where: { clinicId, startAt: { gte: start, lte: end } },
        select: { status: true, startAt: true, professionalId: true },
      }),
      this.prisma.budget.findMany({
        where: { clinicId, createdAt: { gte: start, lte: end } },
        select: { status: true, items: { select: { quantity: true, unitPriceCents: true } } },
      }),
      this.prisma.commissionEntry.findMany({
        where: { clinicId, createdAt: { gte: start, lte: end } },
        select: { professionalId: true, amountCents: true },
      }),
      this.prisma.professional.findMany({
        where: { clinicId },
        select: { id: true, user: { select: { name: true } } },
      }),
    ]);

    return {
      periodo: { from, to },
      faturamento: this.montarFaturamento(transactions, meses, timeZone),
      agenda: this.montarAgenda(appointments, meses, timeZone),
      profissionais: this.montarProfissionais(professionals, transactions, appointments, commissions),
      orcamentos: this.montarOrcamentos(budgets),
    };
  }

  private montarFaturamento(
    transactions: {
      type: string;
      amountCents: number;
      feeCents: number;
      dueDate: Date;
      paidAt: Date | null;
      paymentMethod: PaymentMethod | null;
    }[],
    meses: string[],
    timeZone: string,
  ) {
    let recebidoCents = 0;
    let taxasCents = 0;
    let despesaPagaCents = 0;
    let aReceberCents = 0;

    const porMes = new Map(meses.map((mes) => [mes, { mes, receitaCents: 0, despesaCents: 0 }]));
    // Lançamentos sem forma registrada (quitados antes do campo existir) entram
    // como "não registrado" para a soma do gráfico bater com o total recebido.
    const porForma = new Map<PaymentMethod | "SEM_REGISTRO", number>();

    for (const t of transactions) {
      const receita = t.type === "INCOME";
      if (t.paidAt) {
        if (receita) {
          recebidoCents += t.amountCents;
          taxasCents += t.feeCents;
          const chave = t.paymentMethod ?? "SEM_REGISTRO";
          porForma.set(chave, (porForma.get(chave) ?? 0) + t.amountCents);
        } else {
          despesaPagaCents += t.amountCents;
        }
      } else if (receita) {
        aReceberCents += t.amountCents;
      }

      const balde = porMes.get(mesNoFuso(t.dueDate, timeZone));
      if (balde) {
        if (receita) balde.receitaCents += t.amountCents;
        else balde.despesaCents += t.amountCents;
      }
    }

    return {
      recebidoCents,
      taxasCents,
      liquidoCents: recebidoCents - taxasCents,
      despesaPagaCents,
      // saldo usa o líquido: taxa de maquininha é dinheiro que a clínica não viu
      saldoCents: recebidoCents - taxasCents - despesaPagaCents,
      aReceberCents,
      porMes: meses.map((mes) => porMes.get(mes)!),
      porForma: [...porForma.entries()]
        .map(([metodo, totalCents]) => ({ metodo, totalCents }))
        .sort((a, b) => b.totalCents - a.totalCents),
    };
  }

  private montarAgenda(
    appointments: { status: string; startAt: Date }[],
    meses: string[],
    timeZone: string,
  ) {
    const porMes = new Map(meses.map((mes) => [mes, { mes, total: 0, faltas: 0 }]));
    let concluidas = 0;
    let faltas = 0;
    let canceladas = 0;

    for (const a of appointments) {
      if (a.status === "COMPLETED") concluidas += 1;
      if (a.status === "NO_SHOW") faltas += 1;
      if (a.status === "CANCELLED") canceladas += 1;

      const balde = porMes.get(mesNoFuso(a.startAt, timeZone));
      if (balde) {
        balde.total += 1;
        if (a.status === "NO_SHOW") balde.faltas += 1;
      }
    }

    // Falta só faz sentido sobre o que era para ter acontecido: concluídas + faltas.
    // Canceladas com aviso não contam como falta, senão a taxa fica inflada.
    return {
      total: appointments.length,
      concluidas,
      faltas,
      canceladas,
      taxaFaltaPct: pct(faltas, concluidas + faltas),
      porMes: meses.map((mes) => porMes.get(mes)!),
    };
  }

  private montarProfissionais(
    professionals: { id: string; user: { name: string } }[],
    transactions: { type: string; amountCents: number; paidAt: Date | null; professionalId: string | null }[],
    appointments: { status: string; professionalId: string }[],
    commissions: { professionalId: string; amountCents: number }[],
  ) {
    return professionals
      .map((p) => ({
        id: p.id,
        nome: p.user.name,
        receitaCents: transactions
          .filter((t) => t.professionalId === p.id && t.type === "INCOME" && t.paidAt)
          .reduce((soma, t) => soma + t.amountCents, 0),
        atendimentos: appointments.filter((a) => a.professionalId === p.id && a.status === "COMPLETED").length,
        comissaoCents: commissions
          .filter((c) => c.professionalId === p.id)
          .reduce((soma, c) => soma + c.amountCents, 0),
      }))
      .filter((p) => p.receitaCents > 0 || p.atendimentos > 0)
      .sort((a, b) => b.receitaCents - a.receitaCents);
  }

  private montarOrcamentos(budgets: { status: string; items: { quantity: number; unitPriceCents: number }[] }[]) {
    const totalDo = (b: (typeof budgets)[number]) =>
      b.items.reduce((soma, i) => soma + i.quantity * i.unitPriceCents, 0);

    let totalCents = 0;
    let aprovadoCents = 0;
    let pendenteCents = 0;
    let recusadoCents = 0;
    let qtdAprovado = 0;

    for (const b of budgets) {
      const valor = totalDo(b);
      totalCents += valor;
      if (b.status === "APPROVED") {
        aprovadoCents += valor;
        qtdAprovado += 1;
      } else if (b.status === "PENDING") {
        pendenteCents += valor;
      } else {
        recusadoCents += valor;
      }
    }

    return {
      totalCents,
      aprovadoCents,
      pendenteCents,
      recusadoCents,
      qtdTotal: budgets.length,
      qtdAprovado,
      taxaConversaoPct: pct(qtdAprovado, budgets.length),
    };
  }
}
