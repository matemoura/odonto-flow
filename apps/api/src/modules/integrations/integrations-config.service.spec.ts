import { ForbiddenException } from "@nestjs/common";
import { IntegrationsConfigService } from "./integrations-config.service";
import { PrismaService } from "../../database/prisma.service";

function fakePrisma(overrides: Record<string, unknown> = {}) {
  return {
    integrationConfig: { findMany: jest.fn(), findUnique: jest.fn(), upsert: jest.fn() },
    clinic: { findMany: jest.fn(), findUniqueOrThrow: jest.fn(), update: jest.fn() },
    ...overrides,
  } as unknown as PrismaService;
}

describe("IntegrationsConfigService.requireReleased", () => {
  // Esta é a regra que mudou: sem linha na tabela, a integração está FECHADA.
  // Antes a ausência valia como "mock liberado" e toda clínica tinha as cinco.
  it("recusa quando não existe liberação para a clínica", async () => {
    const prisma = fakePrisma();
    (prisma.integrationConfig.findUnique as jest.Mock).mockResolvedValue(null);
    const service = new IntegrationsConfigService(prisma);

    await expect(service.requireReleased("clinic-1", "WHATSAPP")).rejects.toThrow(ForbiddenException);
  });

  it("recusa quando a liberação existe mas está desligada", async () => {
    const prisma = fakePrisma();
    (prisma.integrationConfig.findUnique as jest.Mock).mockResolvedValue({
      providerName: "mock",
      enabled: false,
    });
    const service = new IntegrationsConfigService(prisma);

    await expect(service.requireReleased("clinic-1", "WHATSAPP")).rejects.toThrow(ForbiddenException);
  });

  it("devolve o provedor liberado pelo dono da plataforma", async () => {
    const prisma = fakePrisma();
    (prisma.integrationConfig.findUnique as jest.Mock).mockResolvedValue({
      providerName: "meta-cloud-api",
      enabled: true,
    });
    const service = new IntegrationsConfigService(prisma);

    await expect(service.requireReleased("clinic-1", "WHATSAPP")).resolves.toEqual({
      providerName: "meta-cloud-api",
    });
  });
});

describe("IntegrationsConfigService.getClinicView", () => {
  it("mostra só o que foi liberado — a clínica não vê a lista completa", async () => {
    const prisma = fakePrisma();
    (prisma.clinic.findUniqueOrThrow as jest.Mock).mockResolvedValue({ whatsappPhone: "+5511900000000" });
    (prisma.integrationConfig.findMany as jest.Mock).mockResolvedValue([
      { kind: "WHATSAPP", providerName: "mock" },
    ]);
    const service = new IntegrationsConfigService(prisma);

    const view = await service.getClinicView("clinic-1");

    expect(view.integrations).toEqual([{ kind: "WHATSAPP", providerName: "mock" }]);
    expect(view.whatsappPhone).toBe("+5511900000000");
    // A consulta já filtra no banco: nada de trazer as fechadas e esconder na tela.
    expect(prisma.integrationConfig.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { clinicId: "clinic-1", enabled: true } }),
    );
  });

  it("não devolve nada quando a clínica não tem integração liberada", async () => {
    const prisma = fakePrisma();
    (prisma.clinic.findUniqueOrThrow as jest.Mock).mockResolvedValue({ whatsappPhone: null });
    (prisma.integrationConfig.findMany as jest.Mock).mockResolvedValue([]);
    const service = new IntegrationsConfigService(prisma);

    await expect(service.getClinicView("clinic-1")).resolves.toEqual({
      whatsappPhone: null,
      integrations: [],
    });
  });
});

describe("IntegrationsConfigService.updateClinicSettings", () => {
  it("grava só o número da clínica — provedor e liberação não passam por aqui", async () => {
    const prisma = fakePrisma();
    (prisma.clinic.findUniqueOrThrow as jest.Mock).mockResolvedValue({ whatsappPhone: "+5511987654321" });
    (prisma.integrationConfig.findMany as jest.Mock).mockResolvedValue([]);
    const service = new IntegrationsConfigService(prisma);

    await service.updateClinicSettings("clinic-1", { whatsappPhone: "+5511987654321" });

    expect(prisma.clinic.update).toHaveBeenCalledWith({
      where: { id: "clinic-1" },
      data: { whatsappPhone: "+5511987654321" },
    });
    expect(prisma.integrationConfig.upsert).not.toHaveBeenCalled();
  });

  it("apagar o campo salva nulo, e não string vazia", async () => {
    const prisma = fakePrisma();
    (prisma.clinic.findUniqueOrThrow as jest.Mock).mockResolvedValue({ whatsappPhone: null });
    (prisma.integrationConfig.findMany as jest.Mock).mockResolvedValue([]);
    const service = new IntegrationsConfigService(prisma);

    await service.updateClinicSettings("clinic-1", { whatsappPhone: "  " });

    expect(prisma.clinic.update).toHaveBeenCalledWith({
      where: { id: "clinic-1" },
      data: { whatsappPhone: null },
    });
  });

  it("salvar o CNPJ do emissor não mexe no WhatsApp, e vice-versa", async () => {
    const prisma = fakePrisma();
    (prisma.clinic.findUniqueOrThrow as jest.Mock).mockResolvedValue({ nfeCnpjEmissor: "12345678000199" });
    (prisma.integrationConfig.findMany as jest.Mock).mockResolvedValue([]);
    const service = new IntegrationsConfigService(prisma);

    await service.updateClinicSettings("clinic-1", { nfeCnpjEmissor: "12345678000199" });

    expect(prisma.clinic.update).toHaveBeenCalledWith({
      where: { id: "clinic-1" },
      data: { nfeCnpjEmissor: "12345678000199" },
    });
  });
});

describe("IntegrationsConfigService.listForPlatform", () => {
  it("traz as cinco integrações de cada clínica, inclusive as fechadas", async () => {
    const prisma = fakePrisma();
    (prisma.clinic.findMany as jest.Mock).mockResolvedValue([
      { id: "clinic-1", name: "Vila Nova", slug: "vila-nova" },
    ]);
    (prisma.integrationConfig.findMany as jest.Mock).mockResolvedValue([
      { clinicId: "clinic-1", kind: "WHATSAPP", providerName: "meta-cloud-api", enabled: true },
    ]);
    const service = new IntegrationsConfigService(prisma);

    const [clinica] = await service.listForPlatform();

    expect(clinica.integrations).toHaveLength(5);
    expect(clinica.integrations).toContainEqual({
      kind: "WHATSAPP",
      providerName: "meta-cloud-api",
      enabled: true,
    });
    // As que ninguém configurou aparecem fechadas — é o que o dono da
    // plataforma precisa ver para decidir abrir.
    expect(clinica.integrations).toContainEqual({ kind: "NFE", providerName: "mock", enabled: false });
  });
});

describe("IntegrationsConfigService.setRelease", () => {
  it("fechar uma integração não exige repetir o provedor", async () => {
    const prisma = fakePrisma();
    const service = new IntegrationsConfigService(prisma);

    await service.setRelease("clinic-1", "NFE", { enabled: false });

    expect(prisma.integrationConfig.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: { providerName: "mock", enabled: false },
      }),
    );
  });
});
