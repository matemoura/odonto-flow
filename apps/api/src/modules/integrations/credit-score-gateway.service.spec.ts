import { NotImplementedException } from "@nestjs/common";
import { CreditScoreGatewayService } from "./credit-score-gateway.service";
import { PrismaService } from "../../database/prisma.service";

function fakePrisma(config: { providerName: string } | null) {
  return {
    integrationConfig: {
      findUnique: jest.fn().mockResolvedValue(config),
    },
  } as unknown as PrismaService;
}

describe("CreditScoreGatewayService", () => {
  it("usa o provedor mock quando não há configuração salva", async () => {
    const service = new CreditScoreGatewayService(fakePrisma(null));
    const result = await service.queryScore("clinic-1", {
      patientId: "patient-1",
      patientCpf: "12345678900",
      consentGivenAt: new Date(),
    });
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(["low", "medium", "high"]).toContain(result.riskBand);
  });

  it("usa o provedor mock quando a configuração explicitamente diz 'mock'", async () => {
    const service = new CreditScoreGatewayService(fakePrisma({ providerName: "mock" }));
    await expect(
      service.queryScore("clinic-1", { patientId: "p1", patientCpf: "123", consentGivenAt: new Date() }),
    ).resolves.toBeDefined();
  });

  it("recusa um provedor real ainda não implementado", async () => {
    const service = new CreditScoreGatewayService(fakePrisma({ providerName: "serasa" }));
    await expect(
      service.queryScore("clinic-1", { patientId: "p1", patientCpf: "123", consentGivenAt: new Date() }),
    ).rejects.toThrow(NotImplementedException);
  });
});
