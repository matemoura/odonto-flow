import { NotFoundException } from "@nestjs/common";
import { FaceogramService } from "./faceogram.service";
import { PrismaService } from "../../database/prisma.service";

function fakePrisma(overrides: Record<string, unknown> = {}) {
  return {
    document: { findFirst: jest.fn() },
    facialPlanning: { findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn() },
    ...overrides,
  } as unknown as PrismaService;
}

describe("FaceogramService.create", () => {
  it("recusa quando a foto não existe (ou não é deste paciente) nesta clínica", async () => {
    const prisma = fakePrisma();
    (prisma.document.findFirst as jest.Mock).mockResolvedValue(null);
    const service = new FaceogramService(prisma);

    await expect(
      service.create("clinic-1", "user-1", { patientId: "p1", documentId: "doc-1", overlayData: [] }),
    ).rejects.toThrow(NotFoundException);
    expect(prisma.facialPlanning.create).not.toHaveBeenCalled();
  });

  it("começa a versão em 1 quando é o primeiro faceograma do paciente", async () => {
    const prisma = fakePrisma();
    (prisma.document.findFirst as jest.Mock).mockResolvedValue({ id: "doc-1" });
    (prisma.facialPlanning.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.facialPlanning.create as jest.Mock).mockImplementation(({ data }) => data);
    const service = new FaceogramService(prisma);

    const result = await service.create("clinic-1", "user-1", {
      patientId: "p1",
      documentId: "doc-1",
      overlayData: [{ kind: "guide" }],
    });

    expect(result.version).toBe(1);
    expect(result.createdBy).toBe("user-1");
  });

  it("incrementa a versão a partir da mais recente já existente", async () => {
    const prisma = fakePrisma();
    (prisma.document.findFirst as jest.Mock).mockResolvedValue({ id: "doc-2" });
    (prisma.facialPlanning.findFirst as jest.Mock).mockResolvedValue({ version: 3 });
    (prisma.facialPlanning.create as jest.Mock).mockImplementation(({ data }) => data);
    const service = new FaceogramService(prisma);

    const result = await service.create("clinic-1", "user-1", {
      patientId: "p1",
      documentId: "doc-2",
      overlayData: [],
    });

    expect(result.version).toBe(4);
  });
});

describe("FaceogramService.getOne", () => {
  it("recusa quando o faceograma não existe nesta clínica", async () => {
    const prisma = fakePrisma();
    (prisma.facialPlanning.findFirst as jest.Mock).mockResolvedValue(null);
    const service = new FaceogramService(prisma);

    await expect(service.getOne("clinic-1", "planning-1")).rejects.toThrow(NotFoundException);
  });
});
