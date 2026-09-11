import { IntegrationsConfigService } from "./integrations-config.service";
import { PrismaService } from "../../database/prisma.service";

function fakePrisma(overrides: Record<string, unknown> = {}) {
  return {
    integrationConfig: { findMany: jest.fn(), upsert: jest.fn() },
    ...overrides,
  } as unknown as PrismaService;
}

describe("IntegrationsConfigService.list", () => {
  it("sintetiza mock/habilitado como padrão para as integrações ainda não configuradas", async () => {
    const prisma = fakePrisma();
    (prisma.integrationConfig.findMany as jest.Mock).mockResolvedValue([]);
    const service = new IntegrationsConfigService(prisma);

    const result = await service.list("clinic-1");

    expect(result).toHaveLength(5);
    expect(result).toEqual(
      expect.arrayContaining([{ kind: "WHATSAPP", providerName: "mock", enabled: true }]),
    );
  });

  it("usa a configuração salva quando existe, e o padrão só para as que faltam", async () => {
    const prisma = fakePrisma();
    (prisma.integrationConfig.findMany as jest.Mock).mockResolvedValue([
      { kind: "NFE", providerName: "focus-nfe", enabled: false },
    ]);
    const service = new IntegrationsConfigService(prisma);

    const result = await service.list("clinic-1");

    expect(result).toContainEqual({ kind: "NFE", providerName: "focus-nfe", enabled: false });
    expect(result).toContainEqual({ kind: "WHATSAPP", providerName: "mock", enabled: true });
  });
});
