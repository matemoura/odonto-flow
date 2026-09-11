import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { ProfessionalsService } from "./professionals.service";
import { PrismaService } from "../../database/prisma.service";

function fakePrisma(overrides: Record<string, unknown> = {}) {
  return {
    user: { findUnique: jest.fn().mockResolvedValue(null), create: jest.fn() },
    professional: { findUnique: jest.fn().mockResolvedValue(null), findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
    clinicMembership: { upsert: jest.fn(), findUnique: jest.fn() },
    ...overrides,
  } as unknown as PrismaService;
}

describe("ProfessionalsService.create", () => {
  it("recusa quando o e-mail já pertence a outro profissional", async () => {
    const prisma = fakePrisma();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: "user-1", email: "ana@example.com" });
    (prisma.professional.findUnique as jest.Mock).mockResolvedValue({ id: "prof-existing" });
    const service = new ProfessionalsService(prisma);

    await expect(
      service.create("clinic-1", { name: "Ana", email: "ana@example.com" }),
    ).rejects.toThrow(ConflictException);
    expect(prisma.professional.create).not.toHaveBeenCalled();
  });

  it("reaproveita um User existente (ex.: já é paciente) sem recriar", async () => {
    const prisma = fakePrisma();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: "user-1", email: "ana@example.com" });
    (prisma.professional.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.professional.create as jest.Mock).mockResolvedValue({ id: "prof-1" });
    const service = new ProfessionalsService(prisma);

    await service.create("clinic-1", { name: "Ana", email: "ana@example.com" });

    expect(prisma.user.create).not.toHaveBeenCalled();
    expect(prisma.clinicMembership.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ create: expect.objectContaining({ userId: "user-1", role: "DENTIST" }) }),
    );
  });

  it("não rebaixa um admin que passa a atender — ele continua administrador", async () => {
    const prisma = fakePrisma();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: "user-1", email: "dono@example.com" });
    (prisma.clinicMembership.findUnique as jest.Mock).mockResolvedValue({ role: "CLINIC_ADMIN" });
    const service = new ProfessionalsService(prisma);

    await service.create("clinic-1", { name: "Dono", email: "dono@example.com" });

    expect(prisma.clinicMembership.upsert).toHaveBeenCalledWith(
      // update vazio: mantém CLINIC_ADMIN em vez de trocar para DENTIST
      expect.objectContaining({ update: {} }),
    );
  });

  it("recusa criar um User novo sem senha (senão a pessoa nunca consegue entrar)", async () => {
    const prisma = fakePrisma();
    const service = new ProfessionalsService(prisma);

    await expect(service.create("clinic-1", { name: "Caio", email: "caio@example.com" })).rejects.toThrow(
      BadRequestException,
    );
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it("cria um User novo com a senha já em hash quando o e-mail ainda não existe", async () => {
    const prisma = fakePrisma();
    (prisma.user.create as jest.Mock).mockResolvedValue({ id: "user-novo" });
    (prisma.professional.create as jest.Mock).mockResolvedValue({ id: "prof-1" });
    const service = new ProfessionalsService(prisma);

    await service.create("clinic-1", { name: "Caio", email: "caio@example.com", password: "senha12345" });

    const callArgs = (prisma.user.create as jest.Mock).mock.calls[0][0];
    expect(callArgs.data.email).toBe("caio@example.com");
    expect(callArgs.data.name).toBe("Caio");
    expect(callArgs.data.passwordHash).toEqual(expect.any(String));
    expect(callArgs.data.passwordHash).not.toBe("senha12345");
  });
});

describe("ProfessionalsService.findAll / findAllPublic", () => {
  it("só busca profissionais cujo usuário ainda tem membership ativa nesta clínica", async () => {
    const prisma = fakePrisma();
    (prisma.professional.findMany as jest.Mock) = jest.fn().mockResolvedValue([]);
    const service = new ProfessionalsService(prisma);

    await service.findAll("clinic-1");

    expect(prisma.professional.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          clinicId: "clinic-1",
          user: { memberships: { some: { clinicId: "clinic-1", role: { in: ["DENTIST", "CLINIC_ADMIN", "ORG_ADMIN"] } } } },
        },
      }),
    );
  });

  it("a lista pública também filtra por membership ativa (sumiu da equipe, some do agendamento)", async () => {
    const prisma = fakePrisma();
    (prisma.professional.findMany as jest.Mock) = jest.fn().mockResolvedValue([]);
    const service = new ProfessionalsService(prisma);

    await service.findAllPublic("clinic-1");

    expect(prisma.professional.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          clinicId: "clinic-1",
          user: { memberships: { some: { clinicId: "clinic-1", role: { in: ["DENTIST", "CLINIC_ADMIN", "ORG_ADMIN"] } } } },
        },
      }),
    );
  });
});

describe("ProfessionalsService.update", () => {
  it("recusa atualizar um profissional inexistente", async () => {
    const prisma = fakePrisma();
    (prisma.professional.findFirst as jest.Mock).mockResolvedValue(null);
    const service = new ProfessionalsService(prisma);

    await expect(service.update("clinic-1", "prof-1", { bio: "novo" })).rejects.toThrow(NotFoundException);
  });
});
