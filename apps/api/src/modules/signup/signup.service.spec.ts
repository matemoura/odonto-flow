import { ConflictException } from "@nestjs/common";
import { SignupService } from "./signup.service";
import { PrismaService } from "../../database/prisma.service";
import { AuthService } from "../auth/auth.service";

function fakePrisma(overrides: Record<string, unknown> = {}) {
  return {
    clinic: { findUnique: jest.fn().mockResolvedValue(null) },
    user: { findUnique: jest.fn().mockResolvedValue(null) },
    $transaction: jest.fn(async (cb: (tx: unknown) => unknown) =>
      cb({
        clinic: { create: jest.fn().mockResolvedValue({ id: "clinic-novo" }) },
        user: { create: jest.fn().mockResolvedValue({ id: "user-novo" }) },
        clinicMembership: { create: jest.fn().mockResolvedValue({}) },
      }),
    ),
    ...overrides,
  } as unknown as PrismaService;
}

function fakeAuth() {
  return { loginStaff: jest.fn().mockResolvedValue({ accessToken: "a", refreshToken: "r", user: {} }) };
}

const DTO = {
  clinicName: "Clínica Nova",
  clinicSlug: "clinica-nova",
  adminName: "Fulano",
  adminEmail: "fulano@example.com",
  adminPassword: "senha12345",
};

describe("SignupService.create", () => {
  it("recusa quando o slug da clínica já está em uso", async () => {
    const prisma = fakePrisma({ clinic: { findUnique: jest.fn().mockResolvedValue({ id: "existing" }) } });
    const service = new SignupService(prisma, fakeAuth() as unknown as AuthService);

    await expect(service.create(DTO)).rejects.toThrow(ConflictException);
  });

  it("recusa quando o e-mail já tem conta", async () => {
    const prisma = fakePrisma({ user: { findUnique: jest.fn().mockResolvedValue({ id: "existing" }) } });
    const service = new SignupService(prisma, fakeAuth() as unknown as AuthService);

    await expect(service.create(DTO)).rejects.toThrow(ConflictException);
  });

  it("cria a clínica, o admin e devolve os tokens de sessão (autologin)", async () => {
    const prisma = fakePrisma();
    const auth = fakeAuth();
    const service = new SignupService(prisma, auth as unknown as AuthService);

    const result = await service.create(DTO);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(auth.loginStaff).toHaveBeenCalledWith(DTO.adminEmail, DTO.adminPassword, "clinic-novo");
    expect(result).toEqual({ accessToken: "a", refreshToken: "r", user: {} });
  });
});

describe("SignupService.isSlugAvailable", () => {
  it("diz que está disponível quando nenhuma clínica usa o slug", async () => {
    const prisma = fakePrisma();
    const service = new SignupService(prisma, fakeAuth() as unknown as AuthService);

    await expect(service.isSlugAvailable("livre")).resolves.toEqual({ available: true });
  });

  it("diz que não está disponível quando já existe uma clínica com o slug", async () => {
    const prisma = fakePrisma({ clinic: { findUnique: jest.fn().mockResolvedValue({ id: "x" }) } });
    const service = new SignupService(prisma, fakeAuth() as unknown as AuthService);

    await expect(service.isSlugAvailable("ocupado")).resolves.toEqual({ available: false });
  });
});
