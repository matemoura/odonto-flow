import { ExecutionContext, ForbiddenException, NotFoundException } from "@nestjs/common";
import { TenantGuard } from "./tenant.guard";
import { PrismaService } from "../../database/prisma.service";

type FakeClinic = {
  id: string;
  createdAt?: Date;
  lastPaymentAt?: Date | null;
  manuallySuspendedAt?: Date | null;
};

function fakePrisma(clinic: FakeClinic | null, gracePeriodDays = 14) {
  const withDefaults = clinic && {
    createdAt: clinic.createdAt ?? new Date(),
    lastPaymentAt: clinic.lastPaymentAt ?? new Date(),
    manuallySuspendedAt: clinic.manuallySuspendedAt ?? null,
    ...clinic,
  };
  return {
    clinic: { findUnique: jest.fn().mockResolvedValue(withDefaults) },
    platformSettings: {
      findUnique: jest.fn().mockResolvedValue({ id: "singleton", delinquencyGracePeriodDays: gracePeriodDays }),
    },
  } as unknown as PrismaService;
}

function fakeContext(request: Record<string, unknown>): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe("TenantGuard", () => {
  it("recusa quando não há slug de clínica na requisição", async () => {
    const guard = new TenantGuard(fakePrisma(null));
    await expect(guard.canActivate(fakeContext({}))).rejects.toThrow(NotFoundException);
  });

  it("recusa quando o slug não corresponde a nenhuma clínica", async () => {
    const guard = new TenantGuard(fakePrisma(null));
    await expect(guard.canActivate(fakeContext({ tenantSlug: "inexistente" }))).rejects.toThrow(NotFoundException);
  });

  it("recusa um usuário autenticado que não tem membership (real ou virtual) nesta clínica", async () => {
    const guard = new TenantGuard(fakePrisma({ id: "clinic-1" }));
    const request = {
      tenantSlug: "vila-nova",
      user: { memberships: [{ clinicId: "clinic-2", role: "CLINIC_ADMIN" }] },
    };

    await expect(guard.canActivate(fakeContext(request))).rejects.toThrow(ForbiddenException);
  });

  it("resolve tenantId e libera quando o usuário tem membership nesta clínica", async () => {
    const guard = new TenantGuard(fakePrisma({ id: "clinic-1" }));
    const request: Record<string, unknown> = {
      tenantSlug: "vila-nova",
      user: { memberships: [{ clinicId: "clinic-1", role: "CLINIC_ADMIN" }] },
    };

    await expect(guard.canActivate(fakeContext(request))).resolves.toBe(true);
    expect(request.tenantId).toBe("clinic-1");
  });

  it("resolve tenantId mesmo sem usuário autenticado (rota pública, ex.: agendamento por link)", async () => {
    const guard = new TenantGuard(fakePrisma({ id: "clinic-1" }));
    const request: Record<string, unknown> = { tenantSlug: "vila-nova" };

    await expect(guard.canActivate(fakeContext(request))).resolves.toBe(true);
    expect(request.tenantId).toBe("clinic-1");
  });

  it("recusa (mesmo rota pública) quando a clínica está suspensa manualmente", async () => {
    const guard = new TenantGuard(fakePrisma({ id: "clinic-1", manuallySuspendedAt: new Date() }));
    const request: Record<string, unknown> = { tenantSlug: "vila-nova" };

    await expect(guard.canActivate(fakeContext(request))).rejects.toThrow(ForbiddenException);
  });

  it("recusa quando a clínica está inadimplente além da carência configurada", async () => {
    const seteDiasAtras = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const guard = new TenantGuard(fakePrisma({ id: "clinic-1", lastPaymentAt: seteDiasAtras }, 3));
    const request: Record<string, unknown> = { tenantSlug: "vila-nova" };

    await expect(guard.canActivate(fakeContext(request))).rejects.toThrow(ForbiddenException);
  });

  it("libera quando não há PlatformSettings ainda (usa carência padrão de 14 dias)", async () => {
    const prisma = fakePrisma({ id: "clinic-1" });
    (prisma.platformSettings.findUnique as jest.Mock).mockResolvedValue(null);
    const guard = new TenantGuard(prisma);
    const request: Record<string, unknown> = { tenantSlug: "vila-nova" };

    await expect(guard.canActivate(fakeContext(request))).resolves.toBe(true);
  });
});
