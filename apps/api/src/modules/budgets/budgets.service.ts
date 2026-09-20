import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { InventoryService } from "../inventory/inventory.service";
import { CreateBudgetDto } from "./dto/create-budget.dto";
import {
  assertPacienteDaClinica,
  assertProfissionalDaClinica,
} from "../../common/scope/tenant-scope.util";
import { dividirEmParcelas, somarMeses } from "../finance/parcelamento.util";
import { zonedDateOnlyToUtc } from "../scheduling/timezone.util";

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
    // Os procedimentos já eram conferidos contra a clínica; paciente e
    // profissional não eram. Um orçamento criado contra paciente de outra
    // clínica vaza o nome dele no contrato gerado — e dispara o envelope de
    // assinatura para o e-mail dessa pessoa.
    await assertPacienteDaClinica(this.prisma, clinicId, dto.patientId);
    await assertProfissionalDaClinica(this.prisma, clinicId, dto.professionalId);

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
  async updateStatus(
    clinicId: string,
    id: string,
    status: "PENDING" | "APPROVED" | "DECLINED" | "EXPIRED",
    pagamento: { installments?: number; firstDueDate?: string } = {},
  ) {
    const budget = await this.prisma.budget.findFirst({ where: { id, clinicId }, include: ITEMS_FOR_STOCK_INCLUDE });
    if (!budget) {
      throw new NotFoundException("Orçamento não encontrado.");
    }

    const wasApproved = budget.status === "APPROVED";
    const willBeApproved = status === "APPROVED";
    if (wasApproved === willBeApproved) {
      return this.prisma.budget.update({ where: { id }, data: { status } });
    }

    // Já existe recebível deste orçamento? Então ele já foi aprovado alguma
    // vez. Reaprovar depois de recusar não pode cobrar o paciente de novo.
    const jaLancado = willBeApproved
      ? (await this.prisma.transaction.count({ where: { clinicId, budgetId: id } })) > 0
      : false;
    const timeZone = willBeApproved && !jaLancado ? await this.getTimezone(clinicId) : null;

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

      if (willBeApproved && !jaLancado && timeZone) {
        await this.lancarRecebiveis(tx, clinicId, budget, pagamento, timeZone);
      }

      return tx.budget.update({ where: { id }, data: { status } });
    });
  }

  /** Fuso da clínica — o vencimento é uma data civil, lida no fuso dela. */
  private async getTimezone(clinicId: string): Promise<string> {
    const clinic = await this.prisma.clinic.findUniqueOrThrow({
      where: { id: clinicId },
      select: { timezone: true },
    });
    return clinic.timezone;
  }

  /**
   * Transforma o orçamento aprovado em contas a receber.
   *
   * O `professionalId` vai junto de propósito: é o que faz a comissão ser
   * gerada sozinha quando a parcela for quitada (ver FinanceService.markPaid).
   * Sem ele, o dinheiro entrava sem comissão e ninguém percebia.
   */
  private async lancarRecebiveis(
    tx: Parameters<Parameters<PrismaService["$transaction"]>[0]>[0],
    clinicId: string,
    budget: { id: string; patientId: string; professionalId: string; items: { quantity: number; unitPriceCents: number }[] },
    pagamento: { installments?: number; firstDueDate?: string },
    timeZone: string,
  ) {
    const totalCents = budget.items.reduce((soma, item) => soma + item.quantity * item.unitPriceCents, 0);
    // Orçamento zerado (só itens de cortesia) não vira cobrança.
    if (totalCents <= 0) return;

    const parcelas = pagamento.installments ?? 1;
    const primeiroVencimento = pagamento.firstDueDate
      ? zonedDateOnlyToUtc(pagamento.firstDueDate, timeZone)
      : new Date();
    const valores = dividirEmParcelas(totalCents, parcelas);

    await tx.transaction.createMany({
      data: valores.map((valor, i) => ({
        clinicId,
        patientId: budget.patientId,
        budgetId: budget.id,
        professionalId: budget.professionalId,
        type: "INCOME" as const,
        category: "Tratamento",
        description: `Orçamento com ${budget.items.length} procedimento(s)`,
        amountCents: valor,
        dueDate: somarMeses(primeiroVencimento, i),
        // Nulos quando é à vista — é o que distingue "1/1" de "sem parcelamento".
        installmentNumber: parcelas > 1 ? i + 1 : null,
        installmentTotal: parcelas > 1 ? parcelas : null,
      })),
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
