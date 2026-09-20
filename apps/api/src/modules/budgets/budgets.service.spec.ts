import { BadRequestException, NotFoundException } from "@nestjs/common";
import { BudgetsService } from "./budgets.service";
import { PrismaService } from "../../database/prisma.service";
import { InventoryService } from "../inventory/inventory.service";

function fakePrisma(overrides: Record<string, unknown> = {}) {
  return {
    procedure: { findMany: jest.fn() },
    // Por padrão paciente e profissional SÃO desta clínica; o teste de
    // isolamento sobrescreve com `null`.
    patient: { findFirst: jest.fn().mockResolvedValue({ id: "patient-1" }) },
    professional: { findFirst: jest.fn().mockResolvedValue({ id: "prof-1" }) },
    budget: { create: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
    budgetItem: { findFirst: jest.fn(), update: jest.fn() },
    // Aprovar passou a lançar contas a receber: o serviço consulta se já
    // existe recebível deste orçamento e o fuso da clínica.
    transaction: { count: jest.fn().mockResolvedValue(0), createMany: jest.fn() },
    clinic: {
      findUniqueOrThrow: jest.fn().mockResolvedValue({ timezone: "America/Sao_Paulo" }),
    },
    $transaction: jest.fn(async (cb: (tx: unknown) => unknown) =>
      cb({
        budget: { update: jest.fn().mockResolvedValue({ id: "budget-1" }) },
        budgetItem: { update: jest.fn().mockResolvedValue({ id: "item-1" }) },
        transaction: { createMany: jest.fn() },
      }),
    ),
    ...overrides,
  } as unknown as PrismaService;
}

function fakeInventory(overrides: Record<string, unknown> = {}) {
  return {
    reserveForBudgetItem: jest.fn(),
    releaseForBudgetItem: jest.fn(),
    consumeForBudgetItem: jest.fn(),
    ...overrides,
  } as unknown as InventoryService;
}

describe("BudgetsService.create", () => {
  it("recusa quando algum procedureId não pertence à clínica", async () => {
    const prisma = fakePrisma();
    (prisma.procedure.findMany as jest.Mock).mockResolvedValue([{ id: "proc-1", defaultPriceCents: 10000 }]);
    const service = new BudgetsService(prisma, fakeInventory());

    await expect(
      service.create("clinic-1", {
        patientId: "p1",
        professionalId: "prof-1",
        items: [{ procedureId: "proc-1" }, { procedureId: "proc-inexistente" }],
      }),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.budget.create).not.toHaveBeenCalled();
  });

  it("usa o defaultPriceCents do procedimento quando unitPriceCents não é informado", async () => {
    const prisma = fakePrisma();
    (prisma.procedure.findMany as jest.Mock).mockResolvedValue([{ id: "proc-1", defaultPriceCents: 25000 }]);
    (prisma.budget.create as jest.Mock).mockResolvedValue({ id: "budget-1" });
    const service = new BudgetsService(prisma, fakeInventory());

    await service.create("clinic-1", {
      patientId: "p1",
      professionalId: "prof-1",
      items: [{ procedureId: "proc-1" }],
    });

    expect(prisma.budget.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          items: { create: [expect.objectContaining({ unitPriceCents: 25000, quantity: 1 })] },
        }),
      }),
    );
  });

  it("respeita um unitPriceCents explícito em vez do preço padrão do procedimento", async () => {
    const prisma = fakePrisma();
    (prisma.procedure.findMany as jest.Mock).mockResolvedValue([{ id: "proc-1", defaultPriceCents: 25000 }]);
    (prisma.budget.create as jest.Mock).mockResolvedValue({ id: "budget-1" });
    const service = new BudgetsService(prisma, fakeInventory());

    await service.create("clinic-1", {
      patientId: "p1",
      professionalId: "prof-1",
      items: [{ procedureId: "proc-1", unitPriceCents: 19900, quantity: 2 }],
    });

    expect(prisma.budget.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          items: { create: [expect.objectContaining({ unitPriceCents: 19900, quantity: 2 })] },
        }),
      }),
    );
  });
});

describe("BudgetsService.updateStatus", () => {
  it("recusa atualizar um orçamento inexistente", async () => {
    const prisma = fakePrisma();
    (prisma.budget.findFirst as jest.Mock).mockResolvedValue(null);
    const service = new BudgetsService(prisma, fakeInventory());

    await expect(service.updateStatus("clinic-1", "budget-1", "APPROVED")).rejects.toThrow(NotFoundException);
  });

  it("não mexe no estoque quando o status não muda de/para APPROVED (ex.: PENDING → DECLINED)", async () => {
    const prisma = fakePrisma();
    (prisma.budget.findFirst as jest.Mock).mockResolvedValue({ id: "budget-1", status: "PENDING", items: [] });
    const inventory = fakeInventory();
    const service = new BudgetsService(prisma, inventory);

    await service.updateStatus("clinic-1", "budget-1", "DECLINED");

    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.budget.update).toHaveBeenCalledWith({ where: { id: "budget-1" }, data: { status: "DECLINED" } });
  });

  it("reserva os materiais de cada item ainda não finalizado ao aprovar", async () => {
    const item1 = { id: "item-1", quantity: 2, executedAt: null, materialsReservedAt: null, procedure: { materials: [] } };
    const item2 = { id: "item-2", quantity: 1, executedAt: new Date(), materialsReservedAt: null, procedure: { materials: [] } };
    const prisma = fakePrisma();
    (prisma.budget.findFirst as jest.Mock).mockResolvedValue({ id: "budget-1", status: "PENDING", items: [item1, item2] });
    const inventory = fakeInventory();
    const service = new BudgetsService(prisma, inventory);

    await service.updateStatus("clinic-1", "budget-1", "APPROVED");

    expect(inventory.reserveForBudgetItem).toHaveBeenCalledTimes(1);
    expect(inventory.reserveForBudgetItem).toHaveBeenCalledWith(expect.anything(), "clinic-1", item1);
  });

  it("libera a reserva dos itens não finalizados quando o orçamento sai de aprovado", async () => {
    const reservado = { id: "item-1", quantity: 2, executedAt: null, materialsReservedAt: new Date(), procedure: { materials: [] } };
    const jaFinalizado = { id: "item-2", quantity: 1, executedAt: new Date(), materialsReservedAt: new Date(), procedure: { materials: [] } };
    const prisma = fakePrisma();
    (prisma.budget.findFirst as jest.Mock).mockResolvedValue({
      id: "budget-1",
      status: "APPROVED",
      items: [reservado, jaFinalizado],
    });
    const inventory = fakeInventory();
    const service = new BudgetsService(prisma, inventory);

    await service.updateStatus("clinic-1", "budget-1", "DECLINED");

    expect(inventory.releaseForBudgetItem).toHaveBeenCalledTimes(1);
    expect(inventory.releaseForBudgetItem).toHaveBeenCalledWith(expect.anything(), "clinic-1", reservado);
  });
});

describe("BudgetsService.executeItem", () => {
  it("recusa quando o item não existe nesta clínica", async () => {
    const prisma = fakePrisma();
    (prisma.budgetItem.findFirst as jest.Mock).mockResolvedValue(null);
    const service = new BudgetsService(prisma, fakeInventory());

    await expect(service.executeItem("clinic-1", "budget-1", "item-1")).rejects.toThrow(NotFoundException);
  });

  it("recusa finalizar um item de um orçamento que não está aprovado", async () => {
    const prisma = fakePrisma();
    (prisma.budgetItem.findFirst as jest.Mock).mockResolvedValue({
      id: "item-1",
      executedAt: null,
      budget: { clinicId: "clinic-1", status: "PENDING" },
      procedure: { materials: [] },
    });
    const service = new BudgetsService(prisma, fakeInventory());

    await expect(service.executeItem("clinic-1", "budget-1", "item-1")).rejects.toThrow(BadRequestException);
  });

  it("recusa finalizar um item que já foi finalizado antes", async () => {
    const prisma = fakePrisma();
    (prisma.budgetItem.findFirst as jest.Mock).mockResolvedValue({
      id: "item-1",
      executedAt: new Date(),
      budget: { clinicId: "clinic-1", status: "APPROVED" },
      procedure: { materials: [] },
    });
    const service = new BudgetsService(prisma, fakeInventory());

    await expect(service.executeItem("clinic-1", "budget-1", "item-1")).rejects.toThrow(BadRequestException);
  });

  it("consome o estoque e marca o item como finalizado", async () => {
    const item = {
      id: "item-1",
      quantity: 3,
      executedAt: null,
      budget: { clinicId: "clinic-1", status: "APPROVED" },
      procedure: { materials: [{ inventoryItemId: "inv-1", quantityUsed: 2 }] },
    };
    const prisma = fakePrisma();
    (prisma.budgetItem.findFirst as jest.Mock).mockResolvedValue(item);
    const inventory = fakeInventory();
    const service = new BudgetsService(prisma, inventory);

    await service.executeItem("clinic-1", "budget-1", "item-1");

    expect(inventory.consumeForBudgetItem).toHaveBeenCalledWith(expect.anything(), "clinic-1", item);
  });
});

/**
 * Os procedimentos já eram conferidos contra a clínica; paciente e
 * profissional não. Esse era o caminho que vazava dado de verdade: orçamento
 * criado contra paciente de outra clínica → `POST /budgets/:id/contract`
 * grava o NOME dessa pessoa no contrato e dispara o envelope de assinatura
 * para o e-mail dela.
 */
describe("BudgetsService.create — isolamento entre clínicas", () => {
  const ORCAMENTO = {
    patientId: "paciente-da-clinica-b",
    professionalId: "prof-1",
    items: [{ procedureId: "proc-1" }],
  };

  it("recusa paciente de outra clínica", async () => {
    const prisma = fakePrisma({ patient: { findFirst: jest.fn().mockResolvedValue(null) } });
    const service = new BudgetsService(prisma, fakeInventory());

    await expect(service.create("clinic-1", ORCAMENTO)).rejects.toThrow(NotFoundException);
    expect(prisma.budget.create).not.toHaveBeenCalled();
  });

  it("recusa profissional de outra clínica", async () => {
    const prisma = fakePrisma({ professional: { findFirst: jest.fn().mockResolvedValue(null) } });
    const service = new BudgetsService(prisma, fakeInventory());

    await expect(service.create("clinic-1", ORCAMENTO)).rejects.toThrow(NotFoundException);
    expect(prisma.budget.create).not.toHaveBeenCalled();
  });

  it("recusa ANTES de consultar procedimento — não trabalha com id alheio", async () => {
    const prisma = fakePrisma({ patient: { findFirst: jest.fn().mockResolvedValue(null) } });
    const service = new BudgetsService(prisma, fakeInventory());

    await expect(service.create("clinic-1", ORCAMENTO)).rejects.toThrow(NotFoundException);
    expect(prisma.procedure.findMany).not.toHaveBeenCalled();
  });
});

/**
 * Aprovar um orçamento passou a lançar o contas a receber. Antes não lançava
 * nada: a clínica aprovava R$ 5.000 em 10x e redigitava tudo à mão no
 * financeiro, sem vínculo, sem proteção contra lançar duas vezes.
 */
describe("BudgetsService.updateStatus — orçamento aprovado vira contas a receber", () => {
  const ITENS = [
    { id: "item-1", quantity: 2, unitPriceCents: 25000, executedAt: null, materialsReservedAt: null, procedure: { materials: [] } },
    { id: "item-2", quantity: 1, unitPriceCents: 50000, executedAt: null, materialsReservedAt: null, procedure: { materials: [] } },
  ];

  function orcamento(status: string, items = ITENS) {
    return { id: "budget-1", status, patientId: "patient-1", professionalId: "prof-1", items };
  }

  /** Captura o que foi gravado dentro da `$transaction`. */
  function prismaComCaptura(overrides: Record<string, unknown> = {}) {
    const createMany = jest.fn();
    const prisma = fakePrisma({
      $transaction: jest.fn(async (cb: (tx: unknown) => unknown) =>
        cb({
          budget: { update: jest.fn().mockResolvedValue({ id: "budget-1" }) },
          budgetItem: { update: jest.fn() },
          transaction: { createMany },
        }),
      ),
      ...overrides,
    });
    return { prisma, createMany };
  }

  it("soma quantidade × preço de cada item", async () => {
    const { prisma, createMany } = prismaComCaptura();
    (prisma.budget.findFirst as jest.Mock).mockResolvedValue(orcamento("PENDING"));
    const service = new BudgetsService(prisma, fakeInventory());

    await service.updateStatus("clinic-1", "budget-1", "APPROVED");

    const { data } = createMany.mock.calls[0][0];
    expect(data).toHaveLength(1);
    // 2 × 250,00 + 1 × 500,00 = 1.000,00
    expect(data[0].amountCents).toBe(100000);
    expect(data[0].type).toBe("INCOME");
  });

  it("divide em parcelas sem perder centavo e numera cada uma", async () => {
    const { prisma, createMany } = prismaComCaptura();
    (prisma.budget.findFirst as jest.Mock).mockResolvedValue(orcamento("PENDING"));
    const service = new BudgetsService(prisma, fakeInventory());

    await service.updateStatus("clinic-1", "budget-1", "APPROVED", { installments: 3 });

    const { data } = createMany.mock.calls[0][0];
    expect(data).toHaveLength(3);
    expect(data.reduce((soma: number, t: { amountCents: number }) => soma + t.amountCents, 0)).toBe(100000);
    expect(data.map((t: { installmentNumber: number }) => t.installmentNumber)).toEqual([1, 2, 3]);
    expect(data.every((t: { installmentTotal: number }) => t.installmentTotal === 3)).toBe(true);
  });

  it("à vista não finge ser parcela 1/1", async () => {
    const { prisma, createMany } = prismaComCaptura();
    (prisma.budget.findFirst as jest.Mock).mockResolvedValue(orcamento("PENDING"));
    const service = new BudgetsService(prisma, fakeInventory());

    await service.updateStatus("clinic-1", "budget-1", "APPROVED");

    const { data } = createMany.mock.calls[0][0];
    expect(data[0].installmentNumber).toBeNull();
    expect(data[0].installmentTotal).toBeNull();
  });

  // Sem isto, o profissional trabalha e a comissão nunca é gerada: é o
  // `professionalId` no lançamento que faz FinanceService.markPaid gerar a
  // CommissionEntry ao quitar.
  it("leva paciente e profissional para o lançamento", async () => {
    const { prisma, createMany } = prismaComCaptura();
    (prisma.budget.findFirst as jest.Mock).mockResolvedValue(orcamento("PENDING"));
    const service = new BudgetsService(prisma, fakeInventory());

    await service.updateStatus("clinic-1", "budget-1", "APPROVED");

    expect(createMany.mock.calls[0][0].data[0]).toMatchObject({
      patientId: "patient-1",
      professionalId: "prof-1",
      budgetId: "budget-1",
    });
  });

  it("o vencimento é lido no fuso da clínica, não no do servidor", async () => {
    const { prisma, createMany } = prismaComCaptura();
    (prisma.budget.findFirst as jest.Mock).mockResolvedValue(orcamento("PENDING"));
    const service = new BudgetsService(prisma, fakeInventory());

    await service.updateStatus("clinic-1", "budget-1", "APPROVED", { firstDueDate: "2026-10-05" });

    // Meia-noite de 05/10 em São Paulo (UTC-3) = 03:00Z. Literal escrito à mão:
    // montar o esperado com `new Date("2026-10-05")` repetiria o próprio bug.
    expect(createMany.mock.calls[0][0].data[0].dueDate.toISOString()).toBe("2026-10-05T03:00:00.000Z");
  });

  // Recusar e reaprovar não pode cobrar o paciente duas vezes.
  it("não lança de novo quando o orçamento já gerou recebível", async () => {
    const { prisma, createMany } = prismaComCaptura({
      transaction: { count: jest.fn().mockResolvedValue(3), createMany: jest.fn() },
    });
    (prisma.budget.findFirst as jest.Mock).mockResolvedValue(orcamento("DECLINED"));
    const service = new BudgetsService(prisma, fakeInventory());

    await service.updateStatus("clinic-1", "budget-1", "APPROVED");

    expect(createMany).not.toHaveBeenCalled();
  });

  it("recusar um orçamento não lança nada", async () => {
    const { prisma, createMany } = prismaComCaptura();
    (prisma.budget.findFirst as jest.Mock).mockResolvedValue(orcamento("APPROVED"));
    const service = new BudgetsService(prisma, fakeInventory());

    await service.updateStatus("clinic-1", "budget-1", "DECLINED");

    expect(createMany).not.toHaveBeenCalled();
  });

  it("orçamento sem valor não vira cobrança", async () => {
    const { prisma, createMany } = prismaComCaptura();
    (prisma.budget.findFirst as jest.Mock).mockResolvedValue(
      orcamento("PENDING", [
        { id: "item-1", quantity: 1, unitPriceCents: 0, executedAt: null, materialsReservedAt: null, procedure: { materials: [] } },
      ]),
    );
    const service = new BudgetsService(prisma, fakeInventory());

    await service.updateStatus("clinic-1", "budget-1", "APPROVED");

    expect(createMany).not.toHaveBeenCalled();
  });
});
