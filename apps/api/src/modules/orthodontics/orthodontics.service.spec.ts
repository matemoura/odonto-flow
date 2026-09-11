import { NotFoundException } from "@nestjs/common";
import { OrthodonticsService } from "./orthodontics.service";
import { PrismaService } from "../../database/prisma.service";

function fakePrisma(overrides: Record<string, unknown> = {}) {
  return {
    orthodonticTreatment: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    orthodonticStep: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    professional: {
      findFirst: jest.fn(),
    },
    ...overrides,
  } as unknown as PrismaService;
}

describe("OrthodonticsService.addStep", () => {
  it("numera a nova etapa como a próxima sequência, mesmo com etapas já existentes", async () => {
    const prisma = fakePrisma();
    (prisma.orthodonticTreatment.findFirst as jest.Mock)
      .mockResolvedValueOnce({ id: "t1", steps: [{ sequence: 3 }] })
      .mockResolvedValueOnce({ id: "t1", steps: [] });

    const service = new OrthodonticsService(prisma);
    await service.addStep("clinic-1", "t1", { description: "Alinhador 7-8" });

    expect(prisma.orthodonticStep.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ sequence: 4, description: "Alinhador 7-8" }),
    });
  });

  it("recusa adicionar etapa a um tratamento inexistente", async () => {
    const prisma = fakePrisma();
    (prisma.orthodonticTreatment.findFirst as jest.Mock).mockResolvedValue(null);

    const service = new OrthodonticsService(prisma);
    await expect(service.addStep("clinic-1", "t-inexistente", { description: "x" })).rejects.toThrow(
      NotFoundException,
    );
  });
});

describe("OrthodonticsService.updateStepStatus", () => {
  it("marca completedAt só quando o status vira DONE", async () => {
    const prisma = fakePrisma();
    (prisma.orthodonticStep.findFirst as jest.Mock).mockResolvedValue({ id: "s1", treatmentId: "t1" });
    (prisma.orthodonticTreatment.findFirst as jest.Mock).mockResolvedValue({ id: "t1", steps: [] });

    const service = new OrthodonticsService(prisma);
    await service.updateStepStatus("clinic-1", "s1", { status: "DONE" as never });

    expect(prisma.orthodonticStep.update).toHaveBeenCalledWith({
      where: { id: "s1" },
      data: { status: "DONE", completedAt: expect.any(Date) },
    });
  });

  it("limpa completedAt quando o status volta para PENDING", async () => {
    const prisma = fakePrisma();
    (prisma.orthodonticStep.findFirst as jest.Mock).mockResolvedValue({ id: "s1", treatmentId: "t1" });
    (prisma.orthodonticTreatment.findFirst as jest.Mock).mockResolvedValue({ id: "t1", steps: [] });

    const service = new OrthodonticsService(prisma);
    await service.updateStepStatus("clinic-1", "s1", { status: "PENDING" as never });

    expect(prisma.orthodonticStep.update).toHaveBeenCalledWith({
      where: { id: "s1" },
      data: { status: "PENDING", completedAt: null },
    });
  });
});
