import { NotFoundException } from "@nestjs/common";
import { PatientsService } from "./patients.service";
import { PrismaService } from "../../database/prisma.service";

function fakePrisma(overrides: Record<string, unknown> = {}) {
  return {
    patient: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
    professional: { findFirst: jest.fn() },
    ...overrides,
  } as unknown as PrismaService;
}

function usuario(role: string) {
  return { userId: "u1", email: "a@b.com", memberships: [{ clinicId: "clinic-1", role }] };
}

describe("PatientsService.escopoDoProfissional", () => {
  it("não restringe quem não é dentista", async () => {
    const service = new PatientsService(fakePrisma());

    expect(await service.escopoDoProfissional(usuario("CLINIC_ADMIN"), "clinic-1")).toBeNull();
    expect(await service.escopoDoProfissional(usuario("ASSISTANT"), "clinic-1")).toBeNull();
  });

  it("restringe o dentista à ficha de profissional dele", async () => {
    const prisma = fakePrisma();
    (prisma.professional.findFirst as jest.Mock).mockResolvedValue({ id: "prof-9" });
    const service = new PatientsService(prisma);

    expect(await service.escopoDoProfissional(usuario("DENTIST"), "clinic-1")).toBe("prof-9");
  });

  it("dentista sem ficha de profissional não enxerga ninguém (falha fechado)", async () => {
    const prisma = fakePrisma();
    (prisma.professional.findFirst as jest.Mock).mockResolvedValue(null);
    const service = new PatientsService(prisma);

    const escopo = await service.escopoDoProfissional(usuario("DENTIST"), "clinic-1");
    // não pode ser null: null significaria "sem filtro", ou seja, veria tudo
    expect(escopo).not.toBeNull();
    expect(escopo).toBe("__sem_profissional__");
  });
});

describe("PatientsService — escopo do dentista nas consultas", () => {
  it("filtra a listagem pelos pacientes atendidos por aquele profissional", async () => {
    const prisma = fakePrisma();
    const service = new PatientsService(prisma);

    await service.findAll("clinic-1", undefined, "prof-9");

    expect(prisma.patient.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          clinicId: "clinic-1",
          appointments: { some: { professionalId: "prof-9" } },
        }),
      }),
    );
  });

  it("esconde o paciente de outro dentista com o mesmo 404 de inexistente", async () => {
    const prisma = fakePrisma();
    (prisma.patient.findFirst as jest.Mock).mockResolvedValue(null);
    const service = new PatientsService(prisma);

    await expect(service.findOne("clinic-1", "p1", "prof-9")).rejects.toThrow(NotFoundException);
    expect(prisma.patient.findFirst).toHaveBeenLastCalledWith({
      where: { id: "p1", clinicId: "clinic-1", appointments: { some: { professionalId: "prof-9" } } },
    });
  });
});

describe("PatientsService.findOne", () => {
  it("lança NotFoundException quando o paciente não existe nesta clínica", async () => {
    const prisma = fakePrisma();
    (prisma.patient.findFirst as jest.Mock).mockResolvedValue(null);
    const service = new PatientsService(prisma);

    await expect(service.findOne("clinic-1", "p1")).rejects.toThrow(NotFoundException);
  });
});

describe("PatientsService.findAll", () => {
  it("filtra por nome (case-insensitive) só quando `search` é informado", async () => {
    const prisma = fakePrisma();
    const service = new PatientsService(prisma);

    await service.findAll("clinic-1");
    expect(prisma.patient.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({ where: { clinicId: "clinic-1" } }),
    );

    await service.findAll("clinic-1", "Marina");
    expect(prisma.patient.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: { clinicId: "clinic-1", name: { contains: "Marina", mode: "insensitive" } },
      }),
    );
  });
});

describe("PatientsService.update", () => {
  it("verifica que o paciente existe nesta clínica antes de atualizar", async () => {
    const prisma = fakePrisma();
    (prisma.patient.findFirst as jest.Mock).mockResolvedValue(null);
    const service = new PatientsService(prisma);

    await expect(service.update("clinic-1", "p1", { name: "Novo nome" })).rejects.toThrow(NotFoundException);
    expect(prisma.patient.update).not.toHaveBeenCalled();
  });
});
