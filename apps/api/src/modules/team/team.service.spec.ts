import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { Role } from "@odontoflow/db";
import { TeamService } from "./team.service";
import { PrismaService } from "../../database/prisma.service";

function fakePrisma(overrides: Record<string, unknown> = {}) {
  return {
    user: { findUnique: jest.fn().mockResolvedValue(null), create: jest.fn() },
    clinicMembership: {
      findUnique: jest.fn().mockResolvedValue(null),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn().mockResolvedValue(1),
    },
    professional: { findUnique: jest.fn().mockResolvedValue(null), create: jest.fn() },
    ...overrides,
  } as unknown as PrismaService;
}

describe("TeamService.create", () => {
  it("recusa quando o e-mail já é membro desta clínica", async () => {
    const prisma = fakePrisma();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: "user-1" });
    (prisma.clinicMembership.findUnique as jest.Mock).mockResolvedValue({ id: "membership-1" });
    const service = new TeamService(prisma);

    await expect(
      service.create("clinic-1", { name: "Ana", email: "ana@example.com", role: Role.ASSISTANT }),
    ).rejects.toThrow(ConflictException);
    expect(prisma.clinicMembership.create).not.toHaveBeenCalled();
  });

  it("recusa criar um User novo sem senha", async () => {
    const prisma = fakePrisma();
    const service = new TeamService(prisma);

    await expect(
      service.create("clinic-1", { name: "Caio", email: "caio@example.com", role: Role.ASSISTANT }),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it("cria um ASSISTANT sem criar Professional", async () => {
    const prisma = fakePrisma();
    (prisma.user.create as jest.Mock).mockResolvedValue({ id: "user-novo" });
    (prisma.clinicMembership.create as jest.Mock).mockResolvedValue({ id: "membership-1" });
    const service = new TeamService(prisma);

    await service.create("clinic-1", {
      name: "Caio",
      email: "caio@example.com",
      password: "senha12345",
      role: Role.ASSISTANT,
    });

    expect(prisma.clinicMembership.create).toHaveBeenCalledWith({
      data: { clinicId: "clinic-1", userId: "user-novo", role: "ASSISTANT" },
    });
    expect(prisma.professional.create).not.toHaveBeenCalled();
  });

  it("cria um DENTIST e também cria o Professional correspondente", async () => {
    const prisma = fakePrisma();
    (prisma.user.create as jest.Mock).mockResolvedValue({ id: "user-novo" });
    (prisma.clinicMembership.create as jest.Mock).mockResolvedValue({ id: "membership-1" });
    (prisma.professional.create as jest.Mock).mockResolvedValue({ id: "prof-1" });
    const service = new TeamService(prisma);

    await service.create("clinic-1", {
      name: "Bia",
      email: "bia@example.com",
      password: "senha12345",
      role: Role.DENTIST,
      croNumber: "CRO-123",
      specialty: "Ortodontia",
    });

    expect(prisma.professional.create).toHaveBeenCalledWith({
      data: {
        clinicId: "clinic-1",
        userId: "user-novo",
        croNumber: "CRO-123",
        specialty: "Ortodontia",
        color: undefined,
        bio: undefined,
      },
    });
  });

  it("reaproveita um User existente sem recriar a senha", async () => {
    const prisma = fakePrisma();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: "user-1" });
    (prisma.clinicMembership.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.clinicMembership.create as jest.Mock).mockResolvedValue({ id: "membership-1" });
    const service = new TeamService(prisma);

    await service.create("clinic-1", { name: "Ana", email: "ana@example.com", role: Role.ASSISTANT });

    expect(prisma.user.create).not.toHaveBeenCalled();
  });
});

describe("TeamService.updateRole", () => {
  it("recusa quando o membro não existe nesta clínica", async () => {
    const prisma = fakePrisma();
    (prisma.clinicMembership.findFirst as jest.Mock).mockResolvedValue(null);
    const service = new TeamService(prisma);

    await expect(service.updateRole("clinic-1", "membership-1", { role: Role.DENTIST })).rejects.toThrow(
      NotFoundException,
    );
  });

  it("recusa rebaixar o último CLINIC_ADMIN da clínica", async () => {
    const prisma = fakePrisma();
    (prisma.clinicMembership.findFirst as jest.Mock).mockResolvedValue({ id: "membership-1", role: "CLINIC_ADMIN" });
    (prisma.clinicMembership.count as jest.Mock).mockResolvedValue(0);
    const service = new TeamService(prisma);

    await expect(service.updateRole("clinic-1", "membership-1", { role: Role.ASSISTANT })).rejects.toThrow(
      BadRequestException,
    );
    expect(prisma.clinicMembership.update).not.toHaveBeenCalled();
  });

  it("permite rebaixar um CLINIC_ADMIN quando existe outro administrador", async () => {
    const prisma = fakePrisma();
    (prisma.clinicMembership.findFirst as jest.Mock).mockResolvedValue({ id: "membership-1", role: "CLINIC_ADMIN" });
    (prisma.clinicMembership.count as jest.Mock).mockResolvedValue(1);
    const service = new TeamService(prisma);

    await service.updateRole("clinic-1", "membership-1", { role: Role.ASSISTANT });

    expect(prisma.clinicMembership.update).toHaveBeenCalledWith({
      where: { id: "membership-1" },
      data: { role: "ASSISTANT" },
    });
  });

  it("cria a ficha de Professional ao promover alguém a DENTIST que nunca teve uma", async () => {
    const prisma = fakePrisma();
    (prisma.clinicMembership.findFirst as jest.Mock).mockResolvedValue({
      id: "membership-1",
      role: "ASSISTANT",
      userId: "user-1",
    });
    const service = new TeamService(prisma);

    await service.updateRole("clinic-1", "membership-1", { role: Role.DENTIST });

    expect(prisma.professional.create).toHaveBeenCalledWith({ data: { clinicId: "clinic-1", userId: "user-1" } });
  });

  it("não duplica a ficha de Professional se a pessoa já tinha uma (ex.: foi rebaixada e promovida de novo)", async () => {
    const prisma = fakePrisma();
    (prisma.clinicMembership.findFirst as jest.Mock).mockResolvedValue({
      id: "membership-1",
      role: "ASSISTANT",
      userId: "user-1",
    });
    (prisma.professional.findUnique as jest.Mock).mockResolvedValue({ id: "prof-1" });
    const service = new TeamService(prisma);

    await service.updateRole("clinic-1", "membership-1", { role: Role.DENTIST });

    expect(prisma.professional.create).not.toHaveBeenCalled();
  });
});

describe("TeamService.remove", () => {
  it("recusa remover o último CLINIC_ADMIN da clínica", async () => {
    const prisma = fakePrisma();
    (prisma.clinicMembership.findFirst as jest.Mock).mockResolvedValue({ id: "membership-1", role: "CLINIC_ADMIN" });
    (prisma.clinicMembership.count as jest.Mock).mockResolvedValue(0);
    const service = new TeamService(prisma);

    await expect(service.remove("clinic-1", "membership-1")).rejects.toThrow(BadRequestException);
    expect(prisma.clinicMembership.delete).not.toHaveBeenCalled();
  });

  it("remove um membro comum normalmente", async () => {
    const prisma = fakePrisma();
    (prisma.clinicMembership.findFirst as jest.Mock).mockResolvedValue({ id: "membership-1", role: "ASSISTANT" });
    const service = new TeamService(prisma);

    await service.remove("clinic-1", "membership-1");

    expect(prisma.clinicMembership.delete).toHaveBeenCalledWith({ where: { id: "membership-1" } });
  });
});
