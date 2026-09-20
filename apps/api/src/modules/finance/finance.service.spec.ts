import { NotFoundException } from "@nestjs/common";
import { FinanceService } from "./finance.service";
import { PrismaService } from "../../database/prisma.service";

/** Clínica em UTC-3: é o que torna visível um período lido no fuso errado. */
const FUSO = "America/Sao_Paulo";

function fakePrisma(overrides: Record<string, unknown> = {}) {
  return {
    transaction: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn(),
      update: jest.fn(),
      create: jest.fn((args: unknown) => args),
    },
    clinic: {
      findUniqueOrThrow: jest.fn().mockResolvedValue({
        cardFeeBasisPoints: 0,
        cardSettlementDays: 0,
        timezone: FUSO,
      }),
      update: jest.fn(),
    },
    commissionRule: { findUnique: jest.fn(), findMany: jest.fn() },
    commissionEntry: { upsert: jest.fn(), findMany: jest.fn() },
    $transaction: jest.fn((operacoes: unknown[]) => Promise.resolve(operacoes)),
    ...overrides,
  } as unknown as PrismaService;
}

describe("FinanceService — bordas do período no fuso da clínica", () => {
  it("consulta lançamentos pelo dia civil da clínica, não pelo fuso do processo", async () => {
    const prisma = fakePrisma();
    const service = new FinanceService(prisma);

    await service.listTransactions("clinic-1", "2026-02-01", "2026-02-28");

    // Instantes UTC absolutos, escritos à mão: fevereiro numa clínica em UTC-3
    // começa às 03:00Z de 01/02 e termina às 02:59:59.999Z de 01/03. Literais
    // em Z de propósito — um esperado montado com `new Date("...T00:00:00")`
    // acompanharia o fuso do processo e deixaria passar o bug.
    expect(prisma.transaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          dueDate: {
            gte: new Date("2026-02-01T03:00:00.000Z"),
            lte: new Date("2026-03-01T02:59:59.999Z"),
          },
        }),
      }),
    );
  });

  it("aplica o mesmo recorte às entradas de comissão", async () => {
    const prisma = fakePrisma();
    (prisma.commissionEntry.findMany as jest.Mock).mockResolvedValue([]);
    const service = new FinanceService(prisma);

    await service.listCommissionEntries("clinic-1", "2026-02-01", "2026-02-28");

    expect(prisma.commissionEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          createdAt: {
            gte: new Date("2026-02-01T03:00:00.000Z"),
            lte: new Date("2026-03-01T02:59:59.999Z"),
          },
        }),
      }),
    );
  });
});

describe("FinanceService.getCashFlowSummary", () => {
  it("separa receita/despesa pagas e pendentes corretamente", async () => {
    const prisma = fakePrisma();
    (prisma.transaction.findMany as jest.Mock).mockResolvedValue([
      { type: "INCOME", amountCents: 10000, paidAt: new Date(), feeCents: 0, settledAt: new Date() },
      { type: "INCOME", amountCents: 5000, paidAt: null, feeCents: 0, settledAt: null },
      { type: "EXPENSE", amountCents: 3000, paidAt: new Date(), feeCents: 0, settledAt: new Date() },
      { type: "EXPENSE", amountCents: 2000, paidAt: null, feeCents: 0, settledAt: null },
    ]);
    const service = new FinanceService(prisma);

    const summary = await service.getCashFlowSummary("clinic-1", "2026-01-01", "2026-01-31");

    expect(summary).toEqual({
      totalIncomeCents: 10000,
      totalFeesCents: 0,
      netIncomeCents: 10000,
      settledIncomeCents: 10000,
      pendingSettlementCents: 0,
      totalExpenseCents: 3000,
      balanceCents: 7000,
      pendingIncomeCents: 5000,
      pendingExpenseCents: 2000,
    });
  });

  it("desconta a taxa do líquido e separa o que ainda não compensou", async () => {
    const prisma = fakePrisma();
    const ontem = new Date(Date.now() - 86400000);
    const daquiUmMes = new Date(Date.now() + 30 * 86400000);
    (prisma.transaction.findMany as jest.Mock).mockResolvedValue([
      // PIX: caiu na hora, sem taxa
      { type: "INCOME", amountCents: 10000, paidAt: ontem, feeCents: 0, settledAt: ontem },
      // cartão: 3% de taxa e ainda dentro do prazo de compensação
      { type: "INCOME", amountCents: 20000, paidAt: ontem, feeCents: 600, settledAt: daquiUmMes },
    ]);
    const service = new FinanceService(prisma);

    const summary = await service.getCashFlowSummary("clinic-1", "2026-01-01", "2026-01-31");

    expect(summary.totalIncomeCents).toBe(30000);
    expect(summary.totalFeesCents).toBe(600);
    expect(summary.netIncomeCents).toBe(29400);
    expect(summary.settledIncomeCents).toBe(10000);
    expect(summary.pendingSettlementCents).toBe(19400);
    expect(summary.balanceCents).toBe(29400);
  });

  it("trata lançamento antigo sem settledAt como já compensado", async () => {
    const prisma = fakePrisma();
    (prisma.transaction.findMany as jest.Mock).mockResolvedValue([
      { type: "INCOME", amountCents: 8000, paidAt: new Date("2026-01-05"), feeCents: 0, settledAt: null },
    ]);
    const service = new FinanceService(prisma);

    const summary = await service.getCashFlowSummary("clinic-1", "2026-01-01", "2026-01-31");

    expect(summary.settledIncomeCents).toBe(8000);
    expect(summary.pendingSettlementCents).toBe(0);
  });
});

describe("FinanceService.create — parcelamento", () => {
  it("divide o total em N parcelas mensais sem perder centavo", async () => {
    const prisma = fakePrisma();
    const service = new FinanceService(prisma);

    await service.create("clinic-1", {
      type: "INCOME",
      category: "Tratamento",
      amountCents: 10000,
      dueDate: "2026-01-31T12:00:00.000Z",
      installments: 3,
    } as never);

    const chamadas = (prisma.transaction.create as jest.Mock).mock.calls;
    expect(chamadas).toHaveLength(3);

    const valores = chamadas.map((c) => c[0].data.amountCents);
    expect(valores).toEqual([3334, 3333, 3333]);
    expect(valores.reduce((a: number, b: number) => a + b, 0)).toBe(10000);

    expect(chamadas.map((c) => c[0].data.installmentNumber)).toEqual([1, 2, 3]);
    expect(chamadas.every((c) => c[0].data.installmentTotal === 3)).toBe(true);

    // 31/01 + 1 mês prende em 28/02, nunca vaza para março
    const vencimentos = chamadas.map((c) => (c[0].data.dueDate as Date).toISOString().slice(0, 10));
    expect(vencimentos).toEqual(["2026-01-31", "2026-02-28", "2026-03-31"]);
  });

  it("cria um lançamento só quando não é parcelado", async () => {
    const prisma = fakePrisma();
    const service = new FinanceService(prisma);

    await service.create("clinic-1", {
      type: "INCOME",
      category: "Consulta",
      amountCents: 15000,
      dueDate: "2026-01-10T12:00:00.000Z",
    } as never);

    const chamadas = (prisma.transaction.create as jest.Mock).mock.calls;
    expect(chamadas).toHaveLength(1);
    expect(chamadas[0][0].data.installmentNumber).toBeUndefined();
  });
});

describe("FinanceService.markPaid", () => {
  it("recusa marcar como paga uma transação inexistente", async () => {
    const prisma = fakePrisma();
    (prisma.transaction.findFirst as jest.Mock).mockResolvedValue(null);
    const service = new FinanceService(prisma);

    await expect(service.markPaid("clinic-1", "tx-1", "PIX")).rejects.toThrow(NotFoundException);
  });

  it("é idempotente — não faz nada se a transação já estava paga", async () => {
    const prisma = fakePrisma();
    const alreadyPaid = { id: "tx-1", paidAt: new Date("2026-01-01") };
    (prisma.transaction.findFirst as jest.Mock).mockResolvedValue(alreadyPaid);
    const service = new FinanceService(prisma);

    const result = await service.markPaid("clinic-1", "tx-1", "PIX");

    expect(result).toBe(alreadyPaid);
    expect(prisma.transaction.update).not.toHaveBeenCalled();
  });

  it("grava a forma de pagamento junto com a data do pagamento", async () => {
    const prisma = fakePrisma();
    (prisma.transaction.findFirst as jest.Mock).mockResolvedValue({
      id: "tx-1",
      paidAt: null,
      type: "INCOME",
      amountCents: 10000,
    });
    (prisma.transaction.update as jest.Mock).mockResolvedValue({ id: "tx-1", type: "INCOME", professionalId: null });
    const service = new FinanceService(prisma);

    await service.markPaid("clinic-1", "tx-1", "CARD");

    expect(prisma.transaction.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "tx-1" },
        data: expect.objectContaining({ paidAt: expect.any(Date), paymentMethod: "CARD" }),
      }),
    );
  });

  it("aplica taxa e prazo da maquininha só em recebimento no cartão", async () => {
    const prisma = fakePrisma();
    (prisma.clinic.findUniqueOrThrow as jest.Mock).mockResolvedValue({
      cardFeeBasisPoints: 300, // 3%
      cardSettlementDays: 30,
    });
    (prisma.transaction.findFirst as jest.Mock).mockResolvedValue({
      id: "tx-1",
      paidAt: null,
      type: "INCOME",
      amountCents: 20000,
    });
    (prisma.transaction.update as jest.Mock).mockResolvedValue({ id: "tx-1", type: "INCOME", professionalId: null });
    const service = new FinanceService(prisma);

    await service.markPaid("clinic-1", "tx-1", "CARD");

    const { data } = (prisma.transaction.update as jest.Mock).mock.calls[0][0];
    expect(data.feeCents).toBe(600);
    const diasAteCompensar = Math.round((data.settledAt.getTime() - data.paidAt.getTime()) / 86400000);
    expect(diasAteCompensar).toBe(30);
  });

  it("não cobra taxa nem adia compensação em PIX", async () => {
    const prisma = fakePrisma();
    (prisma.clinic.findUniqueOrThrow as jest.Mock).mockResolvedValue({
      cardFeeBasisPoints: 300,
      cardSettlementDays: 30,
    });
    (prisma.transaction.findFirst as jest.Mock).mockResolvedValue({
      id: "tx-1",
      paidAt: null,
      type: "INCOME",
      amountCents: 20000,
    });
    (prisma.transaction.update as jest.Mock).mockResolvedValue({ id: "tx-1", type: "INCOME", professionalId: null });
    const service = new FinanceService(prisma);

    await service.markPaid("clinic-1", "tx-1", "PIX");

    const { data } = (prisma.transaction.update as jest.Mock).mock.calls[0][0];
    expect(data.feeCents).toBe(0);
    expect(data.settledAt).toEqual(data.paidAt);
  });

  it("não retém taxa quando a DESPESA é paga no cartão", async () => {
    const prisma = fakePrisma();
    (prisma.clinic.findUniqueOrThrow as jest.Mock).mockResolvedValue({
      cardFeeBasisPoints: 300,
      cardSettlementDays: 30,
    });
    (prisma.transaction.findFirst as jest.Mock).mockResolvedValue({
      id: "tx-1",
      paidAt: null,
      type: "EXPENSE",
      amountCents: 20000,
    });
    (prisma.transaction.update as jest.Mock).mockResolvedValue({ id: "tx-1", type: "EXPENSE", professionalId: null });
    const service = new FinanceService(prisma);

    await service.markPaid("clinic-1", "tx-1", "CARD");

    const { data } = (prisma.transaction.update as jest.Mock).mock.calls[0][0];
    expect(data.feeCents).toBe(0);
    expect(data.settledAt).toEqual(data.paidAt);
  });

  it("gera a comissão automaticamente quando existe CommissionRule para o profissional", async () => {
    const prisma = fakePrisma();
    (prisma.transaction.findFirst as jest.Mock).mockResolvedValue({ id: "tx-1", paidAt: null });
    (prisma.transaction.update as jest.Mock).mockResolvedValue({
      id: "tx-1",
      type: "INCOME",
      professionalId: "prof-1",
      amountCents: 100000,
    });
    (prisma.commissionRule.findUnique as jest.Mock).mockResolvedValue({ percentageBasisPoints: 3000 });
    const service = new FinanceService(prisma);

    await service.markPaid("clinic-1", "tx-1", "PIX");

    expect(prisma.commissionEntry.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ amountCents: 30000, professionalId: "prof-1", transactionId: "tx-1" }),
      }),
    );
  });

  it("não gera comissão para uma despesa, mesmo com profissional vinculado", async () => {
    const prisma = fakePrisma();
    (prisma.transaction.findFirst as jest.Mock).mockResolvedValue({ id: "tx-1", paidAt: null });
    (prisma.transaction.update as jest.Mock).mockResolvedValue({
      id: "tx-1",
      type: "EXPENSE",
      professionalId: "prof-1",
      amountCents: 100000,
    });
    const service = new FinanceService(prisma);

    await service.markPaid("clinic-1", "tx-1", "PIX");

    expect(prisma.commissionRule.findUnique).not.toHaveBeenCalled();
    expect(prisma.commissionEntry.upsert).not.toHaveBeenCalled();
  });

  it("não gera comissão quando não há CommissionRule cadastrada para o profissional", async () => {
    const prisma = fakePrisma();
    (prisma.transaction.findFirst as jest.Mock).mockResolvedValue({ id: "tx-1", paidAt: null });
    (prisma.transaction.update as jest.Mock).mockResolvedValue({
      id: "tx-1",
      type: "INCOME",
      professionalId: "prof-1",
      amountCents: 100000,
    });
    (prisma.commissionRule.findUnique as jest.Mock).mockResolvedValue(null);
    const service = new FinanceService(prisma);

    await service.markPaid("clinic-1", "tx-1", "PIX");

    expect(prisma.commissionEntry.upsert).not.toHaveBeenCalled();
  });
});

/**
 * `CommissionRule.professionalId` é único GLOBAL e o id vem do path param, que
 * o TenantGuard não olha. Sem a checagem, um admin da clínica A reescrevia a
 * comissão de um profissional da clínica B — e recebia de volta a linha dela.
 */
describe("FinanceService.upsertCommissionRule — isolamento entre clínicas", () => {
  it("recusa profissional de outra clínica, sem tocar na regra dele", async () => {
    const prisma = fakePrisma({
      professional: { findFirst: jest.fn().mockResolvedValue(null) },
      commissionRule: { upsert: jest.fn(), findUnique: jest.fn(), findMany: jest.fn() },
    });
    const service = new FinanceService(prisma);

    await expect(
      service.upsertCommissionRule("clinic-1", "prof-da-clinica-b", { percentageBasisPoints: 9999 }),
    ).rejects.toThrow(NotFoundException);
    expect(prisma.commissionRule.upsert).not.toHaveBeenCalled();
  });

  it("grava quando o profissional é da clínica", async () => {
    const prisma = fakePrisma({
      professional: { findFirst: jest.fn().mockResolvedValue({ id: "prof-1" }) },
      commissionRule: { upsert: jest.fn(), findUnique: jest.fn(), findMany: jest.fn() },
    });
    const service = new FinanceService(prisma);

    await service.upsertCommissionRule("clinic-1", "prof-1", { percentageBasisPoints: 3000 });

    expect(prisma.professional.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "prof-1", clinicId: "clinic-1" } }),
    );
    expect(prisma.commissionRule.upsert).toHaveBeenCalled();
  });
});

/**
 * A comissão era calculada e acumulada desde a Fase 2, e o endpoint que a
 * listava não tinha NENHUM consumidor: fechar o mês e pagar a Dra. X era
 * impossível pela interface.
 */
describe("FinanceService.getCommissionReport", () => {
  function entrada(professionalId: string, nome: string, amountCents: number) {
    return {
      id: `entry-${professionalId}-${amountCents}`,
      amountCents,
      createdAt: new Date("2026-10-15T12:00:00.000Z"),
      professional: { id: professionalId, user: { name: nome } },
      transaction: {
        category: "Tratamento",
        dueDate: new Date("2026-10-05T03:00:00.000Z"),
        paidAt: new Date("2026-10-15T12:00:00.000Z"),
        amountCents: amountCents * 10,
        patient: { name: "Fulano" },
      },
    };
  }

  it("agrupa por profissional e soma o que cada um tem a receber", async () => {
    const prisma = fakePrisma({
      commissionEntry: {
        upsert: jest.fn(),
        findMany: jest.fn().mockResolvedValue([
          entrada("prof-1", "Dra. Ana", 10800),
          entrada("prof-2", "Dr. Caio", 5000),
          entrada("prof-1", "Dra. Ana", 7200),
        ]),
      },
    });
    const service = new FinanceService(prisma);

    const relatorio = await service.getCommissionReport("clinic-1", "2026-10-01", "2026-10-31");

    expect(relatorio.totalCents).toBe(23000);
    expect(relatorio.porProfissional).toEqual([
      { professionalId: "prof-1", nome: "Dra. Ana", totalCents: 18000, quantidade: 2 },
      { professionalId: "prof-2", nome: "Dr. Caio", totalCents: 5000, quantidade: 1 },
    ]);
  });

  // Quem tem mais a receber é o que a clínica precisa ver primeiro.
  it("ordena do maior para o menor", async () => {
    const prisma = fakePrisma({
      commissionEntry: {
        upsert: jest.fn(),
        findMany: jest.fn().mockResolvedValue([
          entrada("prof-1", "Dra. Ana", 100),
          entrada("prof-2", "Dr. Caio", 9000),
        ]),
      },
    });
    const service = new FinanceService(prisma);

    const relatorio = await service.getCommissionReport("clinic-1", "2026-10-01", "2026-10-31");

    expect(relatorio.porProfissional.map((p) => p.nome)).toEqual(["Dr. Caio", "Dra. Ana"]);
  });

  it("período vazio devolve zero, não quebra", async () => {
    const prisma = fakePrisma({
      commissionEntry: { upsert: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
    });
    const service = new FinanceService(prisma);

    await expect(service.getCommissionReport("clinic-1", "2026-10-01", "2026-10-31")).resolves.toEqual({
      totalCents: 0,
      porProfissional: [],
      entries: [],
    });
  });

  // O período é lido no fuso da clínica, como todo relatório do financeiro:
  // uma comissão quitada às 23h de 31/10 em São Paulo pertence a outubro.
  it("lê o período no fuso da clínica, não no do servidor", async () => {
    const prisma = fakePrisma({
      commissionEntry: { upsert: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
    });
    const service = new FinanceService(prisma);

    await service.getCommissionReport("clinic-1", "2026-10-01", "2026-10-31");

    const { where } = (prisma.commissionEntry.findMany as jest.Mock).mock.calls[0][0];
    expect(where.createdAt.gte.toISOString()).toBe("2026-10-01T03:00:00.000Z");
    expect(where.createdAt.lte.toISOString()).toBe("2026-11-01T02:59:59.999Z");
  });
});
