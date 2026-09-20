import { join } from "node:path";
import { NotFoundException } from "@nestjs/common";
import { DocumentsService } from "./documents.service";
import { PrismaService } from "../../database/prisma.service";
import { UPLOADS_ROOT } from "./uploads.config";

function fakePrisma(overrides: Record<string, unknown> = {}) {
  return {
    document: { findMany: jest.fn(), create: jest.fn(), findFirst: jest.fn() },
    // Por padrão o paciente é desta clínica; o teste de isolamento sobrescreve.
    patient: { findFirst: jest.fn().mockResolvedValue({ id: "patient-1" }) },
    ...overrides,
  } as unknown as PrismaService;
}

describe("DocumentsService.create", () => {
  it("mapeia o arquivo do multer para os campos do Document", async () => {
    const prisma = fakePrisma();
    (prisma.document.create as jest.Mock).mockResolvedValue({ id: "doc-1" });
    const service = new DocumentsService(prisma);

    const file = {
      filename: "uuid-foto.png",
      originalname: "foto.png",
      mimetype: "image/png",
      size: 1234,
    } as Express.Multer.File;

    await service.create("clinic-1", "patient-1", "PHOTO", file);

    expect(prisma.document.create).toHaveBeenCalledWith({
      data: {
        clinicId: "clinic-1",
        patientId: "patient-1",
        type: "PHOTO",
        storageKey: "uuid-foto.png",
        fileName: "foto.png",
        mimeType: "image/png",
        sizeBytes: 1234,
      },
    });
  });
});

describe("DocumentsService.getFileForDownload", () => {
  it("recusa baixar um documento inexistente nesta clínica", async () => {
    const prisma = fakePrisma();
    (prisma.document.findFirst as jest.Mock).mockResolvedValue(null);
    const service = new DocumentsService(prisma);

    await expect(service.getFileForDownload("clinic-1", "doc-1")).rejects.toThrow(NotFoundException);
  });

  it("resolve o caminho só por clinicId + storageKey — nunca por patientId (ver gotcha de ordem de campos multipart)", async () => {
    const prisma = fakePrisma();
    (prisma.document.findFirst as jest.Mock).mockResolvedValue({
      id: "doc-1",
      clinicId: "clinic-1",
      patientId: "patient-1",
      storageKey: "uuid-foto.png",
    });
    const service = new DocumentsService(prisma);

    const { path } = await service.getFileForDownload("clinic-1", "doc-1");

    expect(path).toBe(join(UPLOADS_ROOT, "clinic-1", "uuid-foto.png"));
  });
});

describe("DocumentsService.create — isolamento entre clínicas", () => {
  it("não registra documento para paciente de outra clínica", async () => {
    const prisma = fakePrisma({ patient: { findFirst: jest.fn().mockResolvedValue(null) } });
    const service = new DocumentsService(prisma);

    await expect(
      service.create("clinic-1", "paciente-da-clinica-b", "RADIOGRAPHY", {
        filename: "uuid.png",
        originalname: "radiografia.png",
        mimetype: "image/png",
        size: 1234,
      } as Express.Multer.File),
    ).rejects.toThrow(NotFoundException);

    expect(prisma.document.create).not.toHaveBeenCalled();
  });
});
