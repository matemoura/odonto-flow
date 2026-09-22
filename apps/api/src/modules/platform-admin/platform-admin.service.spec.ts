import { NotFoundException } from "@nestjs/common";
import { PlatformAdminService } from "./platform-admin.service";
import { PrismaService } from "../../database/prisma.service";

function fakePrisma(overrides: Record<string, unknown> = {}) {
  return {
    clinic: { findMany: jest.fn().mockResolvedValue([]), findUnique: jest.fn(), update: jest.fn() },
    platformSettings: { findUnique: jest.fn().mockResolvedValue(null), upsert: jest.fn() },
    document: { findMany: jest.fn().mockResolvedValue([]) },
    ...overrides,
  } as unknown as PrismaService;
}

function fakeDocumento(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    patientId: "patient-1",
    type: "PHOTO",
    fileName: `${id}.png`,
    sizeBytes: 3,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    content: Buffer.from("abc"),
    clinic: { slug: "vila-nova" },
    ...overrides,
  };
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

describe("PlatformAdminService.appendDocumentsToArchive", () => {
  it("adiciona cada documento ao zip com o caminho clínica/paciente/id-nome, e o manifesto por último", async () => {
    const prisma = fakePrisma({
      document: { findMany: jest.fn().mockResolvedValue([fakeDocumento("doc-1")]) },
    });
    const service = new PlatformAdminService(prisma);
    const archive = { append: jest.fn() };

    await service.appendDocumentsToArchive(archive as never);

    expect(archive.append).toHaveBeenCalledTimes(2);
    expect(archive.append).toHaveBeenNthCalledWith(1, Buffer.from("abc"), {
      name: "vila-nova/patient-1/doc-1-doc-1.png",
    });
    const [manifestoConteudo, manifestoOpcoes] = archive.append.mock.calls[1];
    expect(manifestoOpcoes).toEqual({ name: "manifesto.csv" });
    expect(manifestoConteudo).toContain("vila-nova,patient-1,doc-1,PHOTO,doc-1.png,3,2026-01-01T00:00:00.000Z");
  });

  it("pagina por id — busca a próxima leva só depois de esgotar a anterior", async () => {
    const primeiraLeva = Array.from({ length: 50 }, (_, i) => fakeDocumento(`doc-${i}`));
    const findMany = jest
      .fn()
      .mockResolvedValueOnce(primeiraLeva)
      .mockResolvedValueOnce([fakeDocumento("doc-50")])
      .mockResolvedValueOnce([]);
    const prisma = fakePrisma({ document: { findMany } });
    const service = new PlatformAdminService(prisma);
    const archive = { append: jest.fn() };

    await service.appendDocumentsToArchive(archive as never);

    expect(findMany).toHaveBeenCalledTimes(2);
    expect(findMany.mock.calls[1][0]).toEqual(
      expect.objectContaining({ cursor: { id: "doc-49" }, skip: 1 }),
    );
    // 50 da primeira leva + 1 da segunda + 1 manifesto.
    expect(archive.append).toHaveBeenCalledTimes(52);
  });

  it("não quebra e ainda escreve o manifesto (vazio) quando não há nenhum documento", async () => {
    const prisma = fakePrisma({ document: { findMany: jest.fn().mockResolvedValue([]) } });
    const service = new PlatformAdminService(prisma);
    const archive = { append: jest.fn() };

    await service.appendDocumentsToArchive(archive as never);

    expect(archive.append).toHaveBeenCalledTimes(1);
    expect(archive.append).toHaveBeenCalledWith(expect.any(String), { name: "manifesto.csv" });
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
