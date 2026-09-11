import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InventoryItem, InventoryMovementType, Prisma } from "@odontoflow/db";
import { PrismaService } from "../../database/prisma.service";
import { zonedPeriodBoundsUtc } from "../scheduling/timezone.util";
import { CreateInventoryItemDto } from "./dto/create-inventory-item.dto";
import { UpdateInventoryItemDto } from "./dto/update-inventory-item.dto";
import { AdjustInventoryItemDto } from "./dto/adjust-inventory-item.dto";

/** Item de estoque que um procedimento consome, já com o join carregado. */
type ProcedureMaterialWithItem = { inventoryItemId: string; quantityUsed: number };
type BudgetItemForStock = { id: string; quantity: number; procedure: { materials: ProcedureMaterialWithItem[] } };

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Fuso da clínica. O período do relatório é lido nele, nunca no fuso do
   * processo — a API roda em UTC em produção.
   */
  private async getTimezone(clinicId: string): Promise<string> {
    const clinic = await this.prisma.clinic.findUniqueOrThrow({
      where: { id: clinicId },
      select: { timezone: true },
    });
    return clinic.timezone;
  }

  private serialize(item: InventoryItem) {
    const available = item.quantityOnHand - item.quantityReserved;
    return { ...item, available, needsRestock: available <= item.minQuantity };
  }

  async findAll(clinicId: string) {
    const items = await this.prisma.inventoryItem.findMany({ where: { clinicId }, orderBy: { name: "asc" } });
    return items.map((item) => this.serialize(item));
  }

  async findOne(clinicId: string, id: string) {
    const item = await this.prisma.inventoryItem.findFirst({ where: { id, clinicId } });
    if (!item) {
      throw new NotFoundException("Item de estoque não encontrado.");
    }
    return this.serialize(item);
  }

  create(clinicId: string, dto: CreateInventoryItemDto) {
    return this.prisma.inventoryItem.create({
      data: {
        clinicId,
        name: dto.name,
        unit: dto.unit,
        unitCostCents: dto.unitCostCents ?? 0,
        quantityOnHand: dto.quantityOnHand ?? 0,
        minQuantity: dto.minQuantity ?? 0,
      },
    });
  }

  async update(clinicId: string, id: string, dto: UpdateInventoryItemDto) {
    await this.assertExists(clinicId, id);
    return this.prisma.inventoryItem.update({ where: { id }, data: dto });
  }

  async remove(clinicId: string, id: string) {
    await this.assertExists(clinicId, id);
    const usedByProcedure = await this.prisma.procedureMaterial.count({ where: { inventoryItemId: id } });
    if (usedByProcedure > 0) {
      throw new BadRequestException("Este item está vinculado a um ou mais serviços — remova o vínculo antes de excluir.");
    }
    await this.prisma.inventoryItem.delete({ where: { id } });
  }

  async adjust(clinicId: string, id: string, dto: AdjustInventoryItemDto) {
    const item = await this.assertExists(clinicId, id);
    if (dto.direction === "OUT" && dto.quantity > item.quantityOnHand) {
      throw new BadRequestException("Quantidade maior do que o estoque atual.");
    }

    const delta = dto.direction === "IN" ? dto.quantity : -dto.quantity;
    const [updated] = await this.prisma.$transaction([
      this.prisma.inventoryItem.update({ where: { id }, data: { quantityOnHand: { increment: delta } } }),
      this.prisma.inventoryMovement.create({
        data: {
          clinicId,
          inventoryItemId: id,
          type: dto.direction === "IN" ? InventoryMovementType.MANUAL_IN : InventoryMovementType.MANUAL_OUT,
          quantity: dto.quantity,
          note: dto.note,
        },
      }),
    ]);
    return this.serialize(updated);
  }

  async listMovements(clinicId: string, id: string) {
    await this.assertExists(clinicId, id);
    return this.prisma.inventoryMovement.findMany({
      where: { clinicId, inventoryItemId: id },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Relatório de estoque por período — quanto entrou/saiu manualmente, quanto
   * foi reservado/liberado/consumido por orçamentos, e o quadro atual (em
   * estoque/mínimo/precisa repor) de cada item. Custo de cada movimento usa o
   * `unitCostCents` ATUAL do item (não há histórico de custo por movimento) —
   * uma aproximação razoável já que o custo unitário muda pouco no dia a dia.
   */
  async getReport(clinicId: string, from: string, to: string) {
    const { start, end } = zonedPeriodBoundsUtc(from, to, await this.getTimezone(clinicId));
    const [items, movements] = await Promise.all([
      this.prisma.inventoryItem.findMany({ where: { clinicId }, orderBy: { name: "asc" } }),
      this.prisma.inventoryMovement.findMany({ where: { clinicId, createdAt: { gte: start, lte: end } } }),
    ]);

    const emptyCounts = () => ({
      manualInQuantity: 0,
      manualOutQuantity: 0,
      reservedQuantity: 0,
      releasedQuantity: 0,
      consumedQuantity: 0,
    });

    const countsByItem = new Map<string, ReturnType<typeof emptyCounts>>();
    for (const item of items) countsByItem.set(item.id, emptyCounts());

    for (const movement of movements) {
      const counts = countsByItem.get(movement.inventoryItemId);
      if (!counts) continue;
      if (movement.type === InventoryMovementType.MANUAL_IN) counts.manualInQuantity += movement.quantity;
      else if (movement.type === InventoryMovementType.MANUAL_OUT) counts.manualOutQuantity += movement.quantity;
      else if (movement.type === InventoryMovementType.RESERVED) counts.reservedQuantity += movement.quantity;
      else if (movement.type === InventoryMovementType.RELEASED) counts.releasedQuantity += movement.quantity;
      else if (movement.type === InventoryMovementType.CONSUMED) counts.consumedQuantity += movement.quantity;
    }

    const reportItems = items.map((item) => {
      const counts = countsByItem.get(item.id)!;
      const available = item.quantityOnHand - item.quantityReserved;
      return {
        inventoryItemId: item.id,
        name: item.name,
        unit: item.unit,
        ...counts,
        manualInCostCents: counts.manualInQuantity * item.unitCostCents,
        manualOutCostCents: counts.manualOutQuantity * item.unitCostCents,
        consumedCostCents: counts.consumedQuantity * item.unitCostCents,
        currentQuantityOnHand: item.quantityOnHand,
        currentQuantityReserved: item.quantityReserved,
        minQuantity: item.minQuantity,
        needsRestock: available <= item.minQuantity,
      };
    });

    const totals = reportItems.reduce(
      (acc, i) => ({
        manualInQuantity: acc.manualInQuantity + i.manualInQuantity,
        manualInCostCents: acc.manualInCostCents + i.manualInCostCents,
        manualOutQuantity: acc.manualOutQuantity + i.manualOutQuantity,
        manualOutCostCents: acc.manualOutCostCents + i.manualOutCostCents,
        reservedQuantity: acc.reservedQuantity + i.reservedQuantity,
        releasedQuantity: acc.releasedQuantity + i.releasedQuantity,
        consumedQuantity: acc.consumedQuantity + i.consumedQuantity,
        consumedCostCents: acc.consumedCostCents + i.consumedCostCents,
      }),
      {
        manualInQuantity: 0,
        manualInCostCents: 0,
        manualOutQuantity: 0,
        manualOutCostCents: 0,
        reservedQuantity: 0,
        releasedQuantity: 0,
        consumedQuantity: 0,
        consumedCostCents: 0,
      },
    );

    return { from, to, totals, items: reportItems };
  }

  private async assertExists(clinicId: string, id: string) {
    const item = await this.prisma.inventoryItem.findFirst({ where: { id, clinicId } });
    if (!item) {
      throw new NotFoundException("Item de estoque não encontrado.");
    }
    return item;
  }

  /** Orçamento aprovado — reserva (sem baixar o físico) os materiais de cada item ainda não executado. */
  async reserveForBudgetItem(tx: Prisma.TransactionClient, clinicId: string, item: BudgetItemForStock) {
    for (const material of item.procedure.materials) {
      const quantity = material.quantityUsed * item.quantity;
      await tx.inventoryItem.update({
        where: { id: material.inventoryItemId },
        data: { quantityReserved: { increment: quantity } },
      });
      await tx.inventoryMovement.create({
        data: {
          clinicId,
          inventoryItemId: material.inventoryItemId,
          type: InventoryMovementType.RESERVED,
          quantity,
          budgetItemId: item.id,
        },
      });
    }
  }

  /** Orçamento saiu de aprovado antes de o item ser finalizado — devolve a reserva. */
  async releaseForBudgetItem(tx: Prisma.TransactionClient, clinicId: string, item: BudgetItemForStock) {
    for (const material of item.procedure.materials) {
      const quantity = material.quantityUsed * item.quantity;
      await tx.inventoryItem.update({
        where: { id: material.inventoryItemId },
        data: { quantityReserved: { decrement: quantity } },
      });
      await tx.inventoryMovement.create({
        data: {
          clinicId,
          inventoryItemId: material.inventoryItemId,
          type: InventoryMovementType.RELEASED,
          quantity,
          budgetItemId: item.id,
        },
      });
    }
  }

  /** Procedimento finalizado de verdade — baixa o físico e encerra a reserva. */
  async consumeForBudgetItem(tx: Prisma.TransactionClient, clinicId: string, item: BudgetItemForStock) {
    for (const material of item.procedure.materials) {
      const quantity = material.quantityUsed * item.quantity;
      await tx.inventoryItem.update({
        where: { id: material.inventoryItemId },
        data: { quantityOnHand: { decrement: quantity }, quantityReserved: { decrement: quantity } },
      });
      await tx.inventoryMovement.create({
        data: {
          clinicId,
          inventoryItemId: material.inventoryItemId,
          type: InventoryMovementType.CONSUMED,
          quantity,
          budgetItemId: item.id,
        },
      });
    }
  }
}
