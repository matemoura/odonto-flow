import { BadRequestException, NotFoundException } from "@nestjs/common";
import { InventoryMovementType } from "@odontoflow/db";
import { InventoryService } from "./inventory.service";
import { PrismaService } from "../../database/prisma.service";

/** Clínica em UTC-3: é o que torna visível o período lido no fuso errado. */
const FUSO = "America/Sao_Paulo";

function fakePrisma(overrides: Record<string, unknown> = {}) {
  return {
    clinic: { findUniqueOrThrow: jest.fn().mockResolvedValue({ timezone: FUSO }) },
    inventoryItem: { findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
    inventoryMovement: { create: jest.fn(), findMany: jest.fn() },
    procedureMaterial: { count: jest.fn().mockResolvedValue(0) },
    $transaction: jest.fn(async (ops: unknown[]) => Promise.all(ops as Promise<unknown>[])),
    ...overrides,
  } as unknown as PrismaService;
}

const BASE_ITEM = {
  id: "item-1",
  clinicId: "clinic-1",
  name: "Luva descartável",
  unit: "un",
  unitCostCents: 50,
  quantityOnHand: 100,
  quantityReserved: 20,
  minQuantity: 30,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("InventoryService.findAll/findOne — cálculo de disponível e sinalização", () => {
  it("calcula available = onHand - reserved e needsRestock quando available <= minQuantity", async () => {
    const prisma = fakePrisma();
    (prisma.inventoryItem.findMany as jest.Mock).mockResolvedValue([BASE_ITEM]);
    const service = new InventoryService(prisma);

    const [result] = await service.findAll("clinic-1");

    expect(result.available).toBe(80);
    expect(result.needsRestock).toBe(false);
  });

  it("sinaliza precisa repor quando o disponível cai pra igual ou abaixo do mínimo", async () => {
    const prisma = fakePrisma();
    const lowItem = { ...BASE_ITEM, quantityOnHand: 45, quantityReserved: 20, minQuantity: 30 };
    (prisma.inventoryItem.findFirst as jest.Mock).mockResolvedValue(lowItem);
    const service = new InventoryService(prisma);

    const result = await service.findOne("clinic-1", "item-1");

    expect(result.available).toBe(25);
    expect(result.needsRestock).toBe(true);
  });

  it("lança NotFoundException quando o item não existe nesta clínica", async () => {
    const prisma = fakePrisma();
    (prisma.inventoryItem.findFirst as jest.Mock).mockResolvedValue(null);
    const service = new InventoryService(prisma);

    await expect(service.findOne("clinic-1", "item-x")).rejects.toThrow(NotFoundException);
  });
});

describe("InventoryService.adjust — entrada/saída manual", () => {
  it("recusa uma saída maior do que o estoque físico atual", async () => {
    const prisma = fakePrisma();
    (prisma.inventoryItem.findFirst as jest.Mock).mockResolvedValue(BASE_ITEM);
    const service = new InventoryService(prisma);

    await expect(service.adjust("clinic-1", "item-1", { direction: "OUT", quantity: 999 })).rejects.toThrow(
      BadRequestException,
    );
  });

  it("registra uma entrada manual (MANUAL_IN) e incrementa quantityOnHand", async () => {
    const prisma = fakePrisma();
    (prisma.inventoryItem.findFirst as jest.Mock).mockResolvedValue(BASE_ITEM);
    (prisma.inventoryItem.update as jest.Mock).mockResolvedValue({ ...BASE_ITEM, quantityOnHand: 150 });
    const service = new InventoryService(prisma);

    await service.adjust("clinic-1", "item-1", { direction: "IN", quantity: 50, note: "compra" });

    expect(prisma.inventoryItem.update).toHaveBeenCalledWith({
      where: { id: "item-1" },
      data: { quantityOnHand: { increment: 50 } },
    });
    expect(prisma.inventoryMovement.create).toHaveBeenCalledWith({
      data: { clinicId: "clinic-1", inventoryItemId: "item-1", type: InventoryMovementType.MANUAL_IN, quantity: 50, note: "compra" },
    });
  });

  it("registra uma saída manual (MANUAL_OUT) e decrementa quantityOnHand", async () => {
    const prisma = fakePrisma();
    (prisma.inventoryItem.findFirst as jest.Mock).mockResolvedValue(BASE_ITEM);
    (prisma.inventoryItem.update as jest.Mock).mockResolvedValue({ ...BASE_ITEM, quantityOnHand: 90 });
    const service = new InventoryService(prisma);

    await service.adjust("clinic-1", "item-1", { direction: "OUT", quantity: 10 });

    expect(prisma.inventoryItem.update).toHaveBeenCalledWith({
      where: { id: "item-1" },
      data: { quantityOnHand: { increment: -10 } },
    });
  });
});

describe("InventoryService.remove", () => {
  it("recusa excluir um item ainda vinculado a algum serviço", async () => {
    const prisma = fakePrisma();
    (prisma.inventoryItem.findFirst as jest.Mock).mockResolvedValue(BASE_ITEM);
    (prisma.procedureMaterial.count as jest.Mock).mockResolvedValue(2);
    const service = new InventoryService(prisma);

    await expect(service.remove("clinic-1", "item-1")).rejects.toThrow(BadRequestException);
    expect(prisma.inventoryItem.delete).not.toHaveBeenCalled();
  });

  it("exclui quando nenhum serviço usa este item", async () => {
    const prisma = fakePrisma();
    (prisma.inventoryItem.findFirst as jest.Mock).mockResolvedValue(BASE_ITEM);
    const service = new InventoryService(prisma);

    await service.remove("clinic-1", "item-1");

    expect(prisma.inventoryItem.delete).toHaveBeenCalledWith({ where: { id: "item-1" } });
  });
});

describe("InventoryService — reserva/liberação/consumo por item de orçamento", () => {
  function fakeTx() {
    return {
      inventoryItem: { update: jest.fn() },
      inventoryMovement: { create: jest.fn() },
    };
  }

  const budgetItem = { id: "budget-item-1", quantity: 3, procedure: { materials: [{ inventoryItemId: "inv-1", quantityUsed: 2 }] } };

  it("reserveForBudgetItem incrementa quantityReserved em quantityUsed × quantity e loga RESERVED", async () => {
    const prisma = fakePrisma();
    const service = new InventoryService(prisma);
    const tx = fakeTx();

    await service.reserveForBudgetItem(tx as never, "clinic-1", budgetItem);

    expect(tx.inventoryItem.update).toHaveBeenCalledWith({
      where: { id: "inv-1" },
      data: { quantityReserved: { increment: 6 } },
    });
    expect(tx.inventoryMovement.create).toHaveBeenCalledWith({
      data: { clinicId: "clinic-1", inventoryItemId: "inv-1", type: InventoryMovementType.RESERVED, quantity: 6, budgetItemId: "budget-item-1" },
    });
  });

  it("releaseForBudgetItem decrementa quantityReserved e loga RELEASED", async () => {
    const prisma = fakePrisma();
    const service = new InventoryService(prisma);
    const tx = fakeTx();

    await service.releaseForBudgetItem(tx as never, "clinic-1", budgetItem);

    expect(tx.inventoryItem.update).toHaveBeenCalledWith({
      where: { id: "inv-1" },
      data: { quantityReserved: { decrement: 6 } },
    });
  });

  it("consumeForBudgetItem decrementa quantityOnHand E quantityReserved, e loga CONSUMED", async () => {
    const prisma = fakePrisma();
    const service = new InventoryService(prisma);
    const tx = fakeTx();

    await service.consumeForBudgetItem(tx as never, "clinic-1", budgetItem);

    expect(tx.inventoryItem.update).toHaveBeenCalledWith({
      where: { id: "inv-1" },
      data: { quantityOnHand: { decrement: 6 }, quantityReserved: { decrement: 6 } },
    });
    expect(tx.inventoryMovement.create).toHaveBeenCalledWith({
      data: { clinicId: "clinic-1", inventoryItemId: "inv-1", type: InventoryMovementType.CONSUMED, quantity: 6, budgetItemId: "budget-item-1" },
    });
  });
});

describe("InventoryService.getReport", () => {
  const itemA = { ...BASE_ITEM, id: "item-a", name: "Resina composta", unitCostCents: 100, quantityOnHand: 40, quantityReserved: 0, minQuantity: 10 };
  const itemB = { ...BASE_ITEM, id: "item-b", name: "Lima endodôntica", unitCostCents: 500, quantityOnHand: 5, quantityReserved: 0, minQuantity: 10 };

  it("soma os movimentos do período por tipo e por item, e calcula o custo com o unitCostCents atual", async () => {
    const prisma = fakePrisma();
    (prisma.inventoryItem.findMany as jest.Mock).mockResolvedValue([itemA, itemB]);
    (prisma.inventoryMovement.findMany as jest.Mock).mockResolvedValue([
      { inventoryItemId: "item-a", type: InventoryMovementType.MANUAL_IN, quantity: 20 },
      { inventoryItemId: "item-a", type: InventoryMovementType.CONSUMED, quantity: 4 },
      { inventoryItemId: "item-b", type: InventoryMovementType.RESERVED, quantity: 3 },
      { inventoryItemId: "item-b", type: InventoryMovementType.RELEASED, quantity: 3 },
      { inventoryItemId: "item-b", type: InventoryMovementType.MANUAL_OUT, quantity: 2 },
    ]);
    const service = new InventoryService(prisma);

    const report = await service.getReport("clinic-1", "2026-01-01", "2026-01-31");

    const resina = report.items.find((i) => i.inventoryItemId === "item-a")!;
    expect(resina.manualInQuantity).toBe(20);
    expect(resina.manualInCostCents).toBe(2000);
    expect(resina.consumedQuantity).toBe(4);
    expect(resina.consumedCostCents).toBe(400);

    const lima = report.items.find((i) => i.inventoryItemId === "item-b")!;
    expect(lima.reservedQuantity).toBe(3);
    expect(lima.releasedQuantity).toBe(3);
    expect(lima.manualOutQuantity).toBe(2);
    expect(lima.manualOutCostCents).toBe(1000);
    expect(lima.needsRestock).toBe(true);

    expect(report.totals.manualInQuantity).toBe(20);
    expect(report.totals.consumedCostCents).toBe(400);
    expect(report.totals.manualOutCostCents).toBe(1000);
  });

  it("inclui itens sem nenhum movimento no período com todos os contadores zerados", async () => {
    const prisma = fakePrisma();
    (prisma.inventoryItem.findMany as jest.Mock).mockResolvedValue([itemA]);
    (prisma.inventoryMovement.findMany as jest.Mock).mockResolvedValue([]);
    const service = new InventoryService(prisma);

    const report = await service.getReport("clinic-1", "2026-01-01", "2026-01-31");

    expect(report.items).toHaveLength(1);
    expect(report.items[0]).toMatchObject({
      manualInQuantity: 0,
      manualOutQuantity: 0,
      reservedQuantity: 0,
      releasedQuantity: 0,
      consumedQuantity: 0,
    });
  });

  it("filtra os movimentos pelo intervalo de datas informado (delega ao prisma via createdAt gte/lte)", async () => {
    const prisma = fakePrisma();
    (prisma.inventoryItem.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.inventoryMovement.findMany as jest.Mock).mockResolvedValue([]);
    const service = new InventoryService(prisma);

    await service.getReport("clinic-1", "2026-02-01", "2026-02-28");

    // Instantes UTC absolutos, escritos à mão: fevereiro numa clínica em
    // UTC-3 começa às 03:00Z de 01/02 e termina às 02:59:59.999Z de 01/03.
    // Literais em Z de propósito — se o esperado fosse construído com
    // `new Date("...T00:00:00")`, o teste acompanharia o fuso do processo e
    // deixaria passar exatamente o bug que ele existe para pegar.
    expect(prisma.inventoryMovement.findMany).toHaveBeenCalledWith({
      where: {
        clinicId: "clinic-1",
        createdAt: {
          gte: new Date("2026-02-01T03:00:00.000Z"),
          lte: new Date("2026-03-01T02:59:59.999Z"),
        },
      },
    });
  });
});
