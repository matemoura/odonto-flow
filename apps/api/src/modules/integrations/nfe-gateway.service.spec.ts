import { NotImplementedException } from "@nestjs/common";
import { NfeGatewayService } from "./nfe-gateway.service";
import { PrismaService } from "../../database/prisma.service";

function fakePrisma(config: { providerName: string } | null) {
  return {
    integrationConfig: { findUnique: jest.fn().mockResolvedValue(config) },
  } as unknown as PrismaService;
}

const REQUEST = {
  transactionId: "tx-1",
  amountCents: 10000,
  description: "Restauração",
  customerDocument: "00000000000",
};

describe("NfeGatewayService", () => {
  it("usa o provedor mock quando não há configuração salva", async () => {
    const service = new NfeGatewayService(fakePrisma(null));
    const result = await service.issueServiceInvoice("clinic-1", REQUEST);
    expect(result.externalId).toBeDefined();
  });

  it("usa o provedor mock quando a configuração diz explicitamente 'mock'", async () => {
    const service = new NfeGatewayService(fakePrisma({ providerName: "mock" }));
    await expect(service.issueServiceInvoice("clinic-1", REQUEST)).resolves.toBeDefined();
  });

  it("recusa um provedor real ainda não implementado", async () => {
    const service = new NfeGatewayService(fakePrisma({ providerName: "focus-nfe" }));
    await expect(service.issueServiceInvoice("clinic-1", REQUEST)).rejects.toThrow(NotImplementedException);
  });
});
