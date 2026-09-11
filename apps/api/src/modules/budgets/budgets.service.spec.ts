import { BadRequestException, NotFoundException } from "@nestjs/common";
import { BudgetsService } from "./budgets.service";
import { PrismaService } from "../../database/prisma.service";
import { InventoryService } from "../inventory/inventory.service";

function fakePrisma(overrides: Record<string, unknown> = {}) {
  return {
    procedure: { findMany: jest.fn() },
    budget: { create: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
    budgetItem: { findFirst: jest.fn(), update: jest.fn() },
    $transaction: jest.fn(async (cb: (tx: unknown) => unknown) =>
      cb({
        budget: { update: jest.fn().mockResolvedValue({ id: "budget-1" }) },
        budgetItem: { update: jest.fn().mockResolvedValue({ id: "item-1" }) },
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
