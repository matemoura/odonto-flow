import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { InventoryService } from "../inventory/inventory.service";
import { CreateBudgetDto } from "./dto/create-budget.dto";

const ITEMS_FOR_STOCK_INCLUDE = { items: { include: { procedure: { include: { materials: true } } } } } as const;

@Injectable()
export class BudgetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventory: InventoryService,
  ) {}

  listForPatient(clinicId: string, patientId: string) {
    return this.prisma.budget.findMany({
      where: { clinicId, patientId },
      // `select` no user: `include` traria `passwordHash` de todo profissional
      // para qualquer membro da equipe que abrisse a ficha de um paciente.
      include: {
        items: { include: { procedure: true } },
        professional: { select: { id: true, user: { select: { name: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async create(clinicId: string, dto: CreateBudgetDto) {
    const procedureIds = dto.items.map((item) => item.procedureId);
    const procedures = await this.prisma.procedure.findMany({
      where: { clinicId, id: { in: procedureIds } },
    });
    const procedureById = new Map(procedures.map((p) => [p.id, p]));

    for (const item of dto.items) {
      if (!procedureById.has(item.procedureId)) {
        throw new BadRequestException(`Procedimento ${item.procedureId} não encontrado.`);
      }
    }

    return this.prisma.budget.create({
      data: {
        clinicId,
        patientId: dto.patientId,
        professionalId: dto.professionalId,
        items: {
          create: dto.items.map((item) => ({
            procedureId: item.procedureId,
            toothNumber: item.toothNumber,
            quantity: item.quantity ?? 1,
            unitPriceCents: item.unitPriceCents ?? procedureById.get(item.procedureId)!.defaultPriceCents,
          })),
        },
      },
      include: { items: { include: { procedure: true } } },
    });
  }

  /**
   * Aprovar reserva os materiais de cada item ainda não finalizado (sem baixar
   * o físico); sair de aprovado sem ter finalizado devolve a reserva. Um item
   * já finalizado (executedAt) nunca é mexido de novo — o consumo já aconteceu.
   */
  async updateStatus(clinicId: string, id: string, status: "PENDING" | "APPROVED" | "DECLINED" | "EXPIRED") {
    const budget = await this.prisma.budget.findFirst({ where: { id, clinicId }, include: ITEMS_FOR_STOCK_INCLUDE });
    if (!budget) {
      throw new NotFoundException("Orçamento não encontrado.");
    }

    const wasApproved = budget.status === "APPROVED";
    const willBeApproved = status === "APPROVED";
    if (wasApproved === willBeApproved) {
      return this.prisma.budget.update({ where: { id }, data: { status } });
    }

    return this.prisma.$transaction(async (tx) => {
      for (const item of budget.items) {
        if (item.executedAt) continue;
        if (willBeApproved) {
          await this.inventory.reserveForBudgetItem(tx, clinicId, item);
          await tx.budgetItem.update({ where: { id: item.id }, data: { materialsReservedAt: new Date() } });
        } else if (item.materialsReservedAt) {
          await this.inventory.releaseForBudgetItem(tx, clinicId, item);
          await tx.budgetItem.update({ where: { id: item.id }, data: { materialsReservedAt: null } });
        }
      }
      return tx.budget.update({ where: { id }, data: { status } });
    });
  }

  /** "Finalizar o procedimento na consulta" — baixa real do estoque, encerra a reserva. */
  async executeItem(clinicId: string, budgetId: string, itemId: string) {
    const item = await this.prisma.budgetItem.findFirst({
      where: { id: itemId, budgetId },
      include: { budget: true, procedure: { include: { materials: true } } },
    });
    if (!item || item.budget.clinicId !== clinicId) {
      throw new NotFoundException("Item de orçamento não encontrado.");
    }
    if (item.budget.status !== "APPROVED") {
      throw new BadRequestException("Só é possível finalizar um procedimento de um orçamento aprovado.");
    }
    if (item.executedAt) {
      throw new BadRequestException("Este procedimento já foi finalizado.");
    }

    return this.prisma.$transaction(async (tx) => {
      await this.inventory.consumeForBudgetItem(tx, clinicId, item);
      return tx.budgetItem.update({ where: { id: item.id }, data: { executedAt: new Date() } });
    });
  }
}
