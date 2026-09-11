import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { CreateOpportunityDto } from "./dto/create-opportunity.dto";
import { UpdateOpportunityDto } from "./dto/update-opportunity.dto";

const OPEN_STAGES = ["NEW", "CONTACTED", "BUDGET_SENT", "NEGOTIATING"] as const;

@Injectable()
export class CrmService {
  constructor(private readonly prisma: PrismaService) {}

  /** Lista para o kanban — todas as oportunidades abertas + fechadas recentes. */
  listOpportunities(clinicId: string) {
    return this.prisma.cRMOpportunity.findMany({
      where: { clinicId },
      include: {
        patient: { select: { id: true, name: true, phone: true } },
        owner: { select: { id: true, user: { select: { name: true } } } },
        budget: { select: { id: true, status: true } },
      },
      orderBy: { updatedAt: "desc" },
    });
  }

  async create(clinicId: string, dto: CreateOpportunityDto) {
    const patient = await this.prisma.patient.findFirst({ where: { id: dto.patientId, clinicId } });
    if (!patient) {
      throw new NotFoundException("Paciente não encontrado.");
    }
    return this.prisma.cRMOpportunity.create({
      data: {
        clinicId,
        patientId: dto.patientId,
        title: dto.title,
        budgetId: dto.budgetId,
        ownerId: dto.ownerId,
        notes: dto.notes,
      },
      include: {
        patient: { select: { id: true, name: true, phone: true } },
        owner: { select: { id: true, user: { select: { name: true } } } },
      },
    });
  }

  async update(clinicId: string, id: string, dto: UpdateOpportunityDto) {
    const existing = await this.prisma.cRMOpportunity.findFirst({ where: { id, clinicId } });
    if (!existing) {
      throw new NotFoundException("Oportunidade não encontrada.");
    }
    return this.prisma.cRMOpportunity.update({
      where: { id },
      data: dto,
      include: {
        patient: { select: { id: true, name: true, phone: true } },
        owner: { select: { id: true, user: { select: { name: true } } } },
      },
    });
  }

  /**
   * "Funil de orçamentos não aprovados": orçamentos pendentes há mais tempo,
   * pra priorizar follow-up (ligar/mandar mensagem) — ver plano, Fase 3.
   * Sem envio automático ainda (isso é WhatsApp/IA, Fase 4); por enquanto é
   * só a lista priorizada pro time seguir manualmente.
   */
  async listPendingBudgetsFollowup(clinicId: string) {
    const budgets = await this.prisma.budget.findMany({
      where: { clinicId, status: "PENDING" },
      include: {
        patient: { select: { id: true, name: true, phone: true } },
        professional: { select: { user: { select: { name: true } } } },
        items: { include: { procedure: { select: { name: true, defaultPriceCents: true } } } },
      },
      orderBy: { createdAt: "asc" },
    });

    const now = Date.now();
    return budgets.map((b) => ({
      ...b,
      diasPendente: Math.floor((now - b.createdAt.getTime()) / (24 * 60 * 60 * 1000)),
      totalCents: b.items.reduce((sum, item) => sum + item.unitPriceCents * item.quantity, 0),
    }));
  }

  listStageOptions() {
    return OPEN_STAGES;
  }
}
