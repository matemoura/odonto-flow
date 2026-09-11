import { BadRequestException, NotFoundException } from "@nestjs/common";
import { ProceduresService } from "./procedures.service";
import { PrismaService } from "../../database/prisma.service";

function fakePrisma(overrides: Record<string, unknown> = {}) {
  return {
    procedure: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
    procedureMaterial: {
      findFirst: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    inventoryItem: { findFirst: jest.fn() },
    budgetItem: { count: jest.fn().mockResolvedValue(0) },
    ...overrides,
  } as unknown as PrismaService;
}

describe("ProceduresService.findAll/findOne — custo estimado", () => {
  it("soma quantityUsed × unitCostCents de cada material pra chegar no custo estimado", async () => {
    const prisma = fakePrisma();
    (prisma.procedure.findMany as jest.Mock).mockResolvedValue([
      {
        id: "proc-1",
        name: "Restauração",
        materials: [
          { quantityUsed: 2, inventoryItem: { unitCostCents: 100 } },
          { quantityUsed: 1, inventoryItem: { unitCostCents: 250 } },
        ],
      },
    ]);
    const service = new ProceduresService(prisma);

    const [result] = await service.findAll("clinic-1");

    expect(result.estimatedCostCents).toBe(450);
  });

  it("custo estimado é zero quando o procedimento não tem nenhum material vinculado", async () => {
    const prisma = fakePrisma();
    (prisma.procedure.findFirst as jest.Mock).mockResolvedValue({ id: "proc-1", name: "Consulta", materials: [] });
    const service = new ProceduresService(prisma);

    const result = await service.findOne("clinic-1", "proc-1");

    expect(result.estimatedCostCents).toBe(0);
  });

  it("lança NotFoundException quando o procedimento não existe nesta clínica", async () => {
    const prisma = fakePrisma();
    (prisma.procedure.findFirst as jest.Mock).mockResolvedValue(null);
    const service = new ProceduresService(prisma);

    await expect(service.findOne("clinic-1", "proc-x")).rejects.toThrow(NotFoundException);
  });
});

describe("ProceduresService.remove", () => {
  it("recusa excluir um procedimento já usado em algum orçamento", async () => {
    const prisma = fakePrisma();
    (prisma.procedure.findFirst as jest.Mock).mockResolvedValue({ id: "proc-1" });
    (prisma.budgetItem.count as jest.Mock).mockResolvedValue(3);
    const service = new ProceduresService(prisma);

    await expect(service.remove("clinic-1", "proc-1")).rejects.toThrow(BadRequestException);
    expect(prisma.procedure.delete).not.toHaveBeenCalled();
  });

  it("exclui quando o procedimento nunca foi usado em nenhum orçamento", async () => {
    const prisma = fakePrisma();
    (prisma.procedure.findFirst as jest.Mock).mockResolvedValue({ id: "proc-1" });
    const service = new ProceduresService(prisma);

    await service.remove("clinic-1", "proc-1");

    expect(prisma.procedure.delete).toHaveBeenCalledWith({ where: { id: "proc-1" } });
  });
});

describe("ProceduresService.addMaterial", () => {
  it("recusa vincular um item de estoque que não pertence à clínica", async () => {
    const prisma = fakePrisma();
    (prisma.procedure.findFirst as jest.Mock).mockResolvedValue({ id: "proc-1" });
    (prisma.inventoryItem.findFirst as jest.Mock).mockResolvedValue(null);
    const service = new ProceduresService(prisma);

    await expect(
      service.addMaterial("clinic-1", "proc-1", { inventoryItemId: "inv-x", quantityUsed: 2 }),
    ).rejects.toThrow(NotFoundException);
    expect(prisma.procedureMaterial.upsert).not.toHaveBeenCalled();
  });

  it("faz upsert (cria ou atualiza a quantidade se o material já estava vinculado)", async () => {
    const prisma = fakePrisma();
    (prisma.procedure.findFirst as jest.Mock).mockResolvedValue({ id: "proc-1" });
    (prisma.inventoryItem.findFirst as jest.Mock).mockResolvedValue({ id: "inv-1" });
    const service = new ProceduresService(prisma);

    await service.addMaterial("clinic-1", "proc-1", { inventoryItemId: "inv-1", quantityUsed: 3 });

    expect(prisma.procedureMaterial.upsert).toHaveBeenCalledWith({
      where: { procedureId_inventoryItemId: { procedureId: "proc-1", inventoryItemId: "inv-1" } },
      update: { quantityUsed: 3 },
      create: { procedureId: "proc-1", inventoryItemId: "inv-1", quantityUsed: 3 },
      include: { inventoryItem: true },
    });
  });
});

describe("ProceduresService.updateMaterial/removeMaterial", () => {
  it("recusa editar um material que não pertence a este procedimento/clínica", async () => {
    const prisma = fakePrisma();
    (prisma.procedureMaterial.findFirst as jest.Mock).mockResolvedValue(null);
    const service = new ProceduresService(prisma);

    await expect(
      service.updateMaterial("clinic-1", "proc-1", "material-x", { quantityUsed: 5 }),
    ).rejects.toThrow(NotFoundException);
  });

  it("atualiza a quantidade usada de um material já vinculado", async () => {
    const prisma = fakePrisma();
    (prisma.procedureMaterial.findFirst as jest.Mock).mockResolvedValue({ id: "material-1" });
    const service = new ProceduresService(prisma);

    await service.updateMaterial("clinic-1", "proc-1", "material-1", { quantityUsed: 5 });

    expect(prisma.procedureMaterial.update).toHaveBeenCalledWith({
      where: { id: "material-1" },
      data: { quantityUsed: 5 },
      include: { inventoryItem: true },
    });
  });

  it("remove o vínculo de material do procedimento", async () => {
    const prisma = fakePrisma();
    (prisma.procedureMaterial.findFirst as jest.Mock).mockResolvedValue({ id: "material-1" });
    const service = new ProceduresService(prisma);

    await service.removeMaterial("clinic-1", "proc-1", "material-1");

    expect(prisma.procedureMaterial.delete).toHaveBeenCalledWith({ where: { id: "material-1" } });
  });
});
