import { NotFoundException } from "@nestjs/common";
import { PlatformAdminService } from "./platform-admin.service";
import { PrismaService } from "../../database/prisma.service";

function fakePrisma(overrides: Record<string, unknown> = {}) {
  return {
    clinic: { findMany: jest.fn().mockResolvedValue([]), findUnique: jest.fn(), update: jest.fn() },
    platformSettings: { findUnique: jest.fn().mockResolvedValue(null), upsert: jest.fn() },
    ...overrides,
  } as unknown as PrismaService;
}

describe("PlatformAdminService.getSettings", () => {
  it("devolve o padrão (14 dias) quando ainda não existe registro salvo", async () => {
    const prisma = fakePrisma();
    const service = new PlatformAdminService(prisma);

    const settings = await service.getSettings();

    expect(settings.delinquencyGracePeriodDays).toBe(14);
  });

  it("devolve o valor salvo quando já existe", async () => {
    const prisma = fakePrisma({
      platformSettings: { findUnique: jest.fn().mockResolvedValue({ id: "singleton", delinquencyGracePeriodDays: 30 }) },
    });
    const service = new PlatformAdminService(prisma);

    const settings = await service.getSettings();

    expect(settings.delinquencyGracePeriodDays).toBe(30);
  });
});

describe("PlatformAdminService.listClinics", () => {
  it("anexa o status de assinatura calculado a cada clínica, usando a carência configurada", async () => {
    const emDia = { id: "clinic-1", createdAt: new Date(), lastPaymentAt: new Date(), manuallySuspendedAt: null };
    const inadimplente = {
      id: "clinic-2",
      createdAt: new Date("2020-01-01"),
      lastPaymentAt: new Date("2020-02-01"),
      manuallySuspendedAt: null,
    };
    const prisma = fakePrisma({
      clinic: { findMany: jest.fn().mockResolvedValue([emDia, inadimplente]) },
      platformSettings: { findUnique: jest.fn().mockResolvedValue({ id: "singleton", delinquencyGracePeriodDays: 14 }) },
    });
    const service = new PlatformAdminService(prisma);

    const result = await service.listClinics();

    expect(result[0].subscription.blocked).toBe(false);
    expect(result[1].subscription.blocked).toBe(true);
    expect(result[1].subscription.delinquent).toBe(true);
  });
});

describe("PlatformAdminService — ações por clínica", () => {
  it("recusa registrar pagamento/suspender/reativar de uma clínica inexistente", async () => {
    const prisma = fakePrisma({ clinic: { findUnique: jest.fn().mockResolvedValue(null), update: jest.fn() } });
    const service = new PlatformAdminService(prisma);

    await expect(service.registerPayment("clinic-x")).rejects.toThrow(NotFoundException);
    await expect(service.suspend("clinic-x", {})).rejects.toThrow(NotFoundException);
    await expect(service.reactivate("clinic-x")).rejects.toThrow(NotFoundException);
    expect(prisma.clinic.update).not.toHaveBeenCalled();
  });

  it("registerPayment atualiza lastPaymentAt pra agora", async () => {
    const prisma = fakePrisma({ clinic: { findUnique: jest.fn().mockResolvedValue({ id: "clinic-1" }), update: jest.fn() } });
    const service = new PlatformAdminService(prisma);

    await service.registerPayment("clinic-1");

    expect(prisma.clinic.update).toHaveBeenCalledWith({
      where: { id: "clinic-1" },
      data: { lastPaymentAt: expect.any(Date) },
    });
  });

  it("suspend usa o motivo informado, ou um padrão quando não vem nenhum", async () => {
    const prisma = fakePrisma({ clinic: { findUnique: jest.fn().mockResolvedValue({ id: "clinic-1" }), update: jest.fn() } });
    const service = new PlatformAdminService(prisma);

    await service.suspend("clinic-1", { reason: "Fraude confirmada" });
    expect(prisma.clinic.update).toHaveBeenCalledWith({
      where: { id: "clinic-1" },
      data: { manuallySuspendedAt: expect.any(Date), manuallySuspendedReason: "Fraude confirmada" },
    });

    await service.suspend("clinic-1", {});
    expect(prisma.clinic.update).toHaveBeenLastCalledWith({
      where: { id: "clinic-1" },
      data: { manuallySuspendedAt: expect.any(Date), manuallySuspendedReason: "Suspensa pelo administrador da plataforma." },
    });
  });

  it("reactivate limpa a suspensão manual", async () => {
    const prisma = fakePrisma({ clinic: { findUnique: jest.fn().mockResolvedValue({ id: "clinic-1" }), update: jest.fn() } });
    const service = new PlatformAdminService(prisma);

    await service.reactivate("clinic-1");

    expect(prisma.clinic.update).toHaveBeenCalledWith({
      where: { id: "clinic-1" },
      data: { manuallySuspendedAt: null, manuallySuspendedReason: null },
    });
  });
});
