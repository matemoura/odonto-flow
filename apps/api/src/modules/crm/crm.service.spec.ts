import { NotFoundException } from "@nestjs/common";
import { CrmService } from "./crm.service";
import { PrismaService } from "../../database/prisma.service";

function fakePrisma(overrides: Record<string, unknown> = {}) {
  return {
    patient: { findFirst: jest.fn() },
    cRMOpportunity: { findMany: jest.fn(), create: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
    budget: { findMany: jest.fn() },
    ...overrides,
  } as unknown as PrismaService;
}

describe("CrmService.create", () => {
  it("recusa criar oportunidade para paciente inexistente nesta clínica", async () => {
    const prisma = fakePrisma();
    (prisma.patient.findFirst as jest.Mock).mockResolvedValue(null);
    const service = new CrmService(prisma);

    await expect(service.create("clinic-1", { patientId: "p1", title: "Retorno" })).rejects.toThrow(
      NotFoundException,
    );
  });
});

describe("CrmService.update", () => {
  it("recusa atualizar oportunidade inexistente", async () => {
    const prisma = fakePrisma();
    (prisma.cRMOpportunity.findFirst as jest.Mock).mockResolvedValue(null);
    const service = new CrmService(prisma);

    await expect(service.update("clinic-1", "opp-1", { stage: "WON" })).rejects.toThrow(NotFoundException);
  });
});

describe("CrmService.listPendingBudgetsFollowup", () => {
  it("calcula dias pendente e o total do orçamento a partir dos itens", async () => {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const prisma = fakePrisma();
    (prisma.budget.findMany as jest.Mock).mockResolvedValue([
      {
        id: "budget-1",
        createdAt: oneWeekAgo,
        items: [
          { unitPriceCents: 10000, quantity: 2 },
          { unitPriceCents: 5000, quantity: 1 },
        ],
      },
    ]);
    const service = new CrmService(prisma);

    const [result] = await service.listPendingBudgetsFollowup("clinic-1");

    expect(result.totalCents).toBe(25000);
    expect(result.diasPendente).toBe(7);
  });
});
