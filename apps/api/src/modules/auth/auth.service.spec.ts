import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import * as argon2 from "argon2";
import { AuthService } from "./auth.service";
import { PrismaService } from "../../database/prisma.service";
import { Role } from "@odontoflow/db";

jest.mock("argon2", () => ({ verify: jest.fn() }));

function fakeJwt(overrides: Record<string, unknown> = {}) {
  return {
    signAsync: jest.fn().mockResolvedValue("fake-jwt"),
    verifyAsync: jest.fn(),
    ...overrides,
  };
}

function fakeConfig() {
  return { getOrThrow: jest.fn().mockReturnValue("segredo-de-teste") };
}

/** Clínica em dia por padrão (criada agora, sem suspensão) — sobrescreva só o que o teste precisar. */
function fakeClinicActiveFields(overrides: Record<string, unknown> = {}) {
  return { createdAt: new Date(), lastPaymentAt: new Date(), manuallySuspendedAt: null, ...overrides };
}

describe("AuthService.loginStaff — expansão de ORG_ADMIN (Fase 6)", () => {
  it("adiciona uma membership virtual ORG_ADMIN para clínicas da rede sem membership direta", async () => {
    (argon2.verify as jest.Mock).mockResolvedValue(true);
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: "user-1",
          email: "admin@vilanova.com",
          passwordHash: "hash",
          name: "Admin",
          memberships: [{ clinicId: "clinic-a", role: Role.CLINIC_ADMIN }],
        }),
      },
      organizationMembership: {
        findMany: jest.fn().mockResolvedValue([{ organizationId: "org-1" }]),
      },
      clinic: {
        findMany: jest.fn().mockResolvedValue([{ id: "clinic-a" }, { id: "clinic-b" }]),
        findUniqueOrThrow: jest.fn().mockResolvedValue(fakeClinicActiveFields()),
      },
      platformSettings: { findUnique: jest.fn().mockResolvedValue(null) },
    } as unknown as PrismaService;
    const jwt = fakeJwt();

    const service = new AuthService(prisma, jwt as never, fakeConfig() as never);
    await service.loginStaff("admin@vilanova.com", "senha123", "clinic-a");

    const [[payload]] = (jwt.signAsync as jest.Mock).mock.calls;
    expect(payload.memberships).toEqual(
      expect.arrayContaining([
        { clinicId: "clinic-a", role: Role.CLINIC_ADMIN },
        { clinicId: "clinic-b", role: Role.ORG_ADMIN },
      ]),
    );
    // a clínica onde o usuário já tem membership direta não deve duplicar como ORG_ADMIN
    expect(payload.memberships).toHaveLength(2);
  });

  it("não adiciona memberships virtuais quando o usuário não administra nenhuma rede", async () => {
    (argon2.verify as jest.Mock).mockResolvedValue(true);
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: "user-1",
          email: "ana@vilanova.com",
          passwordHash: "hash",
          name: "Ana",
          memberships: [{ clinicId: "clinic-a", role: Role.DENTIST }],
        }),
      },
      organizationMembership: { findMany: jest.fn().mockResolvedValue([]) },
      clinic: {
        findMany: jest.fn(),
        findUniqueOrThrow: jest.fn().mockResolvedValue(fakeClinicActiveFields()),
      },
      platformSettings: { findUnique: jest.fn().mockResolvedValue(null) },
    } as unknown as PrismaService;
    const jwt = fakeJwt();

    const service = new AuthService(prisma, jwt as never, fakeConfig() as never);
    await service.loginStaff("ana@vilanova.com", "senha123", "clinic-a");

    const [[payload]] = (jwt.signAsync as jest.Mock).mock.calls;
    expect(payload.memberships).toEqual([{ clinicId: "clinic-a", role: Role.DENTIST }]);
    expect(prisma.clinic.findMany).not.toHaveBeenCalled();
  });

  it("recusa login quando a clínica está suspensa/inadimplente, mesmo com senha certa", async () => {
    (argon2.verify as jest.Mock).mockResolvedValue(true);
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: "user-1",
          email: "admin@vilanova.com",
          passwordHash: "hash",
          name: "Admin",
          memberships: [{ clinicId: "clinic-a", role: Role.CLINIC_ADMIN }],
        }),
      },
      clinic: {
        findUniqueOrThrow: jest.fn().mockResolvedValue(fakeClinicActiveFields({ manuallySuspendedAt: new Date() })),
      },
      platformSettings: { findUnique: jest.fn().mockResolvedValue(null) },
    } as unknown as PrismaService;
    const jwt = fakeJwt();

    const service = new AuthService(prisma, jwt as never, fakeConfig() as never);
    await expect(service.loginStaff("admin@vilanova.com", "senha123", "clinic-a")).rejects.toThrow(
      ForbiddenException,
    );
    expect(jwt.signAsync).not.toHaveBeenCalled();
  });
});

describe("AuthService.loginSuperAdmin", () => {
  it("recusa quando o usuário não é super admin", async () => {
    (argon2.verify as jest.Mock).mockResolvedValue(true);
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: "user-1",
          email: "ana@vilanova.com",
          passwordHash: "hash",
          isSuperAdmin: false,
        }),
      },
    } as unknown as PrismaService;

    const service = new AuthService(prisma, fakeJwt() as never, fakeConfig() as never);
    await expect(service.loginSuperAdmin("ana@vilanova.com", "senha123")).rejects.toThrow(UnauthorizedException);
  });

  it("emite um token com isSuperAdmin=true e memberships vazio pra quem é super admin", async () => {
    (argon2.verify as jest.Mock).mockResolvedValue(true);
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: "user-1",
          email: "dono@odontoflow.com",
          name: "Dono",
          passwordHash: "hash",
          isSuperAdmin: true,
        }),
      },
    } as unknown as PrismaService;
    const jwt = fakeJwt();

    const service = new AuthService(prisma, jwt as never, fakeConfig() as never);
    await service.loginSuperAdmin("dono@odontoflow.com", "senha123");

    const [[payload]] = (jwt.signAsync as jest.Mock).mock.calls;
    expect(payload).toEqual(expect.objectContaining({ isSuperAdmin: true, memberships: [] }));
  });
});

describe("AuthService.refreshStaffSession", () => {
  it("recusa um refresh token inválido ou expirado", async () => {
    const jwt = fakeJwt({ verifyAsync: jest.fn().mockRejectedValue(new Error("jwt expired")) });
    const prisma = { user: { findUnique: jest.fn() } } as unknown as PrismaService;

    const service = new AuthService(prisma, jwt as never, fakeConfig() as never);
    await expect(service.refreshStaffSession("token-invalido")).rejects.toThrow(UnauthorizedException);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("recusa um token que não é do tipo 'refresh' (ex.: alguém manda o próprio access token)", async () => {
    const jwt = fakeJwt({ verifyAsync: jest.fn().mockResolvedValue({ sub: "user-1" }) }); // sem type: "refresh"
    const prisma = { user: { findUnique: jest.fn() } } as unknown as PrismaService;

    const service = new AuthService(prisma, jwt as never, fakeConfig() as never);
    await expect(service.refreshStaffSession("token-de-acesso")).rejects.toThrow(UnauthorizedException);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("recusa quando o usuário do token não existe mais", async () => {
    const jwt = fakeJwt({ verifyAsync: jest.fn().mockResolvedValue({ sub: "user-1", type: "refresh" }) });
    const prisma = { user: { findUnique: jest.fn().mockResolvedValue(null) } } as unknown as PrismaService;

    const service = new AuthService(prisma, jwt as never, fakeConfig() as never);
    await expect(service.refreshStaffSession("token-valido")).rejects.toThrow(UnauthorizedException);
  });

  it("emite um access token novo com as memberships recalculadas na hora", async () => {
    const jwt = fakeJwt({ verifyAsync: jest.fn().mockResolvedValue({ sub: "user-1", type: "refresh" }) });
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: "user-1",
          email: "ana@vilanova.com",
          isSuperAdmin: false,
          memberships: [{ clinicId: "clinic-a", role: Role.DENTIST }],
        }),
      },
      organizationMembership: { findMany: jest.fn().mockResolvedValue([]) },
    } as unknown as PrismaService;

    const service = new AuthService(prisma, jwt as never, fakeConfig() as never);
    const result = await service.refreshStaffSession("token-valido");

    expect(result).toEqual({ accessToken: "fake-jwt" });
    const [payload, options] = (jwt.signAsync as jest.Mock).mock.calls[0];
    expect(payload.memberships).toEqual([{ clinicId: "clinic-a", role: Role.DENTIST }]);
    expect(options).toEqual(expect.objectContaining({ expiresIn: "1h" }));
  });

  it("renova um super admin sem tentar recalcular memberships", async () => {
    const jwt = fakeJwt({ verifyAsync: jest.fn().mockResolvedValue({ sub: "user-1", type: "refresh" }) });
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: "user-1",
          email: "dono@odontoflow.com",
          isSuperAdmin: true,
        }),
      },
      organizationMembership: { findMany: jest.fn() },
    } as unknown as PrismaService;

    const service = new AuthService(prisma, jwt as never, fakeConfig() as never);
    await service.refreshStaffSession("token-valido");

    expect(prisma.organizationMembership.findMany).not.toHaveBeenCalled();
    const [[payload]] = (jwt.signAsync as jest.Mock).mock.calls;
    expect(payload).toEqual(expect.objectContaining({ isSuperAdmin: true, memberships: [] }));
  });
});
