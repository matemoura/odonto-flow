import { NotFoundException } from "@nestjs/common";
import { DocumentsService } from "./documents.service";
import { PrismaService } from "../../database/prisma.service";

function fakePrisma(overrides: Record<string, unknown> = {}) {
  return {
    document: { findMany: jest.fn(), create: jest.fn(), findFirst: jest.fn() },
    // Por padrão o paciente é desta clínica; o teste de isolamento sobrescreve.
    patient: { findFirst: jest.fn().mockResolvedValue({ id: "patient-1" }) },
    ...overrides,
  } as unknown as PrismaService;
}

describe("DocumentsService.create", () => {
  it("mapeia o arquivo do multer para os campos do Document, gravando os bytes no banco", async () => {
    const prisma = fakePrisma();
    (prisma.document.create as jest.Mock).mockResolvedValue({ id: "doc-1" });
    const service = new DocumentsService(prisma);

    const file = {
      originalname: "foto.png",
      mimetype: "image/png",
      size: 1234,
      buffer: Buffer.from("conteúdo fake"),
    } as Express.Multer.File;

    await service.create("clinic-1", "patient-1", "PHOTO", file);

    expect(prisma.document.create).toHaveBeenCalledWith({
      data: {
        clinicId: "clinic-1",
        patientId: "patient-1",
        type: "PHOTO",
        fileName: "foto.png",
        mimeType: "image/png",
        sizeBytes: 1234,
        // `Uint8Array`, não `Buffer` — mesmo atrito de tipos do Prisma
        // explicado em `documents.service.ts`; o que importa são os bytes.
        content: new Uint8Array(file.buffer),
      },
      select: expect.objectContaining({ id: true, fileName: true }),
    });
  });

  it("o select da criação nunca pede `content` de volta — evita carregar o binário à toa", async () => {
    const prisma = fakePrisma();
    (prisma.document.create as jest.Mock).mockResolvedValue({ id: "doc-1" });
    const service = new DocumentsService(prisma);

    await service.create("clinic-1", "patient-1", "PHOTO", {
      originalname: "foto.png",
      mimetype: "image/png",
      size: 1,
      buffer: Buffer.from("x"),
    } as Express.Multer.File);

    const call = (prisma.document.create as jest.Mock).mock.calls[0][0];
    expect(call.select.content).toBeUndefined();
  });
});

describe("DocumentsService.listForPatient", () => {
  it("nunca seleciona `content` — listar não deve carregar o binário de cada arquivo", async () => {
    const prisma = fakePrisma();
    const service = new DocumentsService(prisma);

    await service.listForPatient("clinic-1", "patient-1");

    const call = (prisma.document.findMany as jest.Mock).mock.calls[0][0];
    expect(call.select.content).toBeUndefined();
  });
});

describe("DocumentsService.getFileForDownload", () => {
  it("recusa baixar um documento inexistente nesta clínica", async () => {
    const prisma = fakePrisma();
    (prisma.document.findFirst as jest.Mock).mockResolvedValue(null);
    const service = new DocumentsService(prisma);

    await expect(service.getFileForDownload("clinic-1", "doc-1")).rejects.toThrow(NotFoundException);
  });

  it("busca o documento só por clinicId — nunca por patientId (ver gotcha de ordem de campos multipart)", async () => {
    const prisma = fakePrisma();
    (prisma.document.findFirst as jest.Mock).mockResolvedValue({
      fileName: "foto.png",
      mimeType: "image/png",
      content: Buffer.from("bytes"),
    });
    const service = new DocumentsService(prisma);

    const document = await service.getFileForDownload("clinic-1", "doc-1");

    expect(prisma.document.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "doc-1", clinicId: "clinic-1" } }),
    );
    expect(document.content).toEqual(Buffer.from("bytes"));
  });
});

describe("DocumentsService.create — isolamento entre clínicas", () => {
  it("não registra documento para paciente de outra clínica", async () => {
    const prisma = fakePrisma({ patient: { findFirst: jest.fn().mockResolvedValue(null) } });
    const service = new DocumentsService(prisma);

    await expect(
      service.create("clinic-1", "paciente-da-clinica-b", "RADIOGRAPHY", {
        originalname: "radiografia.png",
        mimetype: "image/png",
        size: 1234,
        buffer: Buffer.from("x"),
      } as Express.Multer.File),
    ).rejects.toThrow(NotFoundException);

    expect(prisma.document.create).not.toHaveBeenCalled();
  });
});
