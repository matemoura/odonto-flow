import { DashboardService } from "./dashboard.service";
import { PrismaService } from "../../database/prisma.service";

const FUSO = "America/Sao_Paulo";

function fakePrisma(dados: {
  transactions?: unknown[];
  appointments?: unknown[];
  budgets?: unknown[];
  commissions?: unknown[];
  professionals?: unknown[];
}) {
  return {
    clinic: { findUniqueOrThrow: jest.fn().mockResolvedValue({ timezone: FUSO }) },
    transaction: { findMany: jest.fn().mockResolvedValue(dados.transactions ?? []) },
    appointment: { findMany: jest.fn().mockResolvedValue(dados.appointments ?? []) },
    budget: { findMany: jest.fn().mockResolvedValue(dados.budgets ?? []) },
    commissionEntry: { findMany: jest.fn().mockResolvedValue(dados.commissions ?? []) },
    professional: { findMany: jest.fn().mockResolvedValue(dados.professionals ?? []) },
  } as unknown as PrismaService;
}

describe("DashboardService.getOverview — faturamento", () => {
  it("separa recebido, despesa paga e a receber, e soma por forma de pagamento", async () => {
    const prisma = fakePrisma({
      transactions: [
        { type: "INCOME", amountCents: 10000, feeCents: 0, dueDate: new Date("2026-09-05T12:00:00Z"), paidAt: new Date(), paymentMethod: "PIX", professionalId: null },
        { type: "INCOME", amountCents: 5000, feeCents: 0, dueDate: new Date("2026-09-06T12:00:00Z"), paidAt: new Date(), paymentMethod: "CARD", professionalId: null },
        { type: "INCOME", amountCents: 2000, feeCents: 0, dueDate: new Date("2026-09-07T12:00:00Z"), paidAt: null, paymentMethod: null, professionalId: null },
        { type: "EXPENSE", amountCents: 3000, feeCents: 0, dueDate: new Date("2026-09-08T12:00:00Z"), paidAt: new Date(), paymentMethod: "CASH", professionalId: null },
      ],
    });
    const service = new DashboardService(prisma);

    const { faturamento } = await service.getOverview("clinic-1", "2026-09-01", "2026-09-30");

    expect(faturamento.recebidoCents).toBe(15000);
    expect(faturamento.despesaPagaCents).toBe(3000);
    expect(faturamento.saldoCents).toBe(12000);
    expect(faturamento.liquidoCents).toBe(15000);
    expect(faturamento.aReceberCents).toBe(2000);
    expect(faturamento.porForma).toEqual([
      { metodo: "PIX", totalCents: 10000 },
      { metodo: "CARD", totalCents: 5000 },
    ]);
  });

  it("desconta a taxa de cartão do líquido e do saldo", async () => {
    const prisma = fakePrisma({
      transactions: [
        { type: "INCOME", amountCents: 20000, feeCents: 600, dueDate: new Date("2026-09-05T12:00:00Z"), paidAt: new Date(), paymentMethod: "CARD", professionalId: null },
      ],
    });
    const service = new DashboardService(prisma);

    const { faturamento } = await service.getOverview("clinic-1", "2026-09-01", "2026-09-30");

    expect(faturamento.recebidoCents).toBe(20000);
    expect(faturamento.taxasCents).toBe(600);
    expect(faturamento.liquidoCents).toBe(19400);
    expect(faturamento.saldoCents).toBe(19400);
  });

  it("classifica lançamento quitado sem forma registrada como SEM_REGISTRO", async () => {
    const prisma = fakePrisma({
      transactions: [
        { type: "INCOME", amountCents: 8000, feeCents: 0, dueDate: new Date("2026-09-05T12:00:00Z"), paidAt: new Date(), paymentMethod: null, professionalId: null },
      ],
    });
    const service = new DashboardService(prisma);

    const { faturamento } = await service.getOverview("clinic-1", "2026-09-01", "2026-09-30");

    expect(faturamento.porForma).toEqual([{ metodo: "SEM_REGISTRO", totalCents: 8000 }]);
  });

  it("devolve um balde por mês do período, mesmo sem movimento no mês", async () => {
    const prisma = fakePrisma({});
    const service = new DashboardService(prisma);

    const { faturamento } = await service.getOverview("clinic-1", "2026-07-01", "2026-09-30");

    expect(faturamento.porMes.map((m) => m.mes)).toEqual(["2026-07", "2026-08", "2026-09"]);
    expect(faturamento.porMes.every((m) => m.receitaCents === 0)).toBe(true);
  });
});

describe("DashboardService.getOverview — agenda", () => {
  it("calcula taxa de falta sobre concluídas + faltas, ignorando canceladas", async () => {
    const prisma = fakePrisma({
      appointments: [
        { status: "COMPLETED", startAt: new Date("2026-09-01T12:00:00Z"), professionalId: "p1" },
        { status: "COMPLETED", startAt: new Date("2026-09-02T12:00:00Z"), professionalId: "p1" },
        { status: "COMPLETED", startAt: new Date("2026-09-03T12:00:00Z"), professionalId: "p1" },
        { status: "NO_SHOW", startAt: new Date("2026-09-04T12:00:00Z"), professionalId: "p1" },
        { status: "CANCELLED", startAt: new Date("2026-09-05T12:00:00Z"), professionalId: "p1" },
      ],
    });
    const service = new DashboardService(prisma);

    const { agenda } = await service.getOverview("clinic-1", "2026-09-01", "2026-09-30");

    expect(agenda.concluidas).toBe(3);
    expect(agenda.faltas).toBe(1);
    expect(agenda.canceladas).toBe(1);
    expect(agenda.taxaFaltaPct).toBe(25);
  });

  it("não divide por zero quando não houve consulta nenhuma", async () => {
    const service = new DashboardService(fakePrisma({}));

    const { agenda } = await service.getOverview("clinic-1", "2026-09-01", "2026-09-30");

    expect(agenda.taxaFaltaPct).toBe(0);
  });
});

describe("DashboardService.getOverview — profissionais e orçamentos", () => {
  it("ranqueia profissionais por receita e omite quem não teve movimento", async () => {
    const prisma = fakePrisma({
      professionals: [
        { id: "p1", user: { name: "Dra. Ana" } },
        { id: "p2", user: { name: "Dr. Caio" } },
        { id: "p3", user: { name: "Dra. Sem Movimento" } },
      ],
      transactions: [
        { type: "INCOME", amountCents: 20000, feeCents: 0, dueDate: new Date("2026-09-01T12:00:00Z"), paidAt: new Date(), paymentMethod: "PIX", professionalId: "p2" },
        { type: "INCOME", amountCents: 50000, feeCents: 0, dueDate: new Date("2026-09-02T12:00:00Z"), paidAt: new Date(), paymentMethod: "PIX", professionalId: "p1" },
      ],
      appointments: [{ status: "COMPLETED", startAt: new Date("2026-09-01T12:00:00Z"), professionalId: "p1" }],
      commissions: [{ professionalId: "p1", amountCents: 15000 }],
    });
    const service = new DashboardService(prisma);

    const { profissionais } = await service.getOverview("clinic-1", "2026-09-01", "2026-09-30");

    expect(profissionais).toEqual([
      { id: "p1", nome: "Dra. Ana", receitaCents: 50000, atendimentos: 1, comissaoCents: 15000 },
      { id: "p2", nome: "Dr. Caio", receitaCents: 20000, atendimentos: 0, comissaoCents: 0 },
    ]);
  });

  it("calcula conversão de orçamentos pelo total de itens de cada status", async () => {
    const prisma = fakePrisma({
      budgets: [
        { status: "APPROVED", items: [{ quantity: 2, unitPriceCents: 10000 }] },
        { status: "PENDING", items: [{ quantity: 1, unitPriceCents: 30000 }] },
        { status: "DECLINED", items: [{ quantity: 1, unitPriceCents: 5000 }] },
        { status: "APPROVED", items: [{ quantity: 1, unitPriceCents: 10000 }] },
      ],
    });
    const service = new DashboardService(prisma);

    const { orcamentos } = await service.getOverview("clinic-1", "2026-09-01", "2026-09-30");

    expect(orcamentos.aprovadoCents).toBe(30000);
    expect(orcamentos.pendenteCents).toBe(30000);
    expect(orcamentos.recusadoCents).toBe(5000);
    expect(orcamentos.totalCents).toBe(65000);
    expect(orcamentos.taxaConversaoPct).toBe(50);
  });
});
