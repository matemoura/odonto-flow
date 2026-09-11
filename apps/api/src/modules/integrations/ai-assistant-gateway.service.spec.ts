import { NotImplementedException } from "@nestjs/common";
import { AiAssistantGatewayService } from "./ai-assistant-gateway.service";
import { PrismaService } from "../../database/prisma.service";

function fakePrisma(config: { providerName: string } | null) {
  return {
    integrationConfig: { findUnique: jest.fn().mockResolvedValue(config) },
  } as unknown as PrismaService;
}

describe("AiAssistantGatewayService", () => {
  it("usa o provedor mock quando não há configuração salva", async () => {
    const service = new AiAssistantGatewayService(fakePrisma(null));
    const reply = await service.chat("clinic-1", [{ role: "user", content: "Oi" }]);
    expect(typeof reply).toBe("string");
    expect(reply.length).toBeGreaterThan(0);
  });

  it("usa o provedor mock quando a configuração diz explicitamente 'mock'", async () => {
    const service = new AiAssistantGatewayService(fakePrisma({ providerName: "mock" }));
    await expect(service.chat("clinic-1", [{ role: "user", content: "Oi" }])).resolves.toBeDefined();
  });

  it("recusa um provedor real ainda não implementado", async () => {
    const service = new AiAssistantGatewayService(fakePrisma({ providerName: "claude" }));
    await expect(service.chat("clinic-1", [{ role: "user", content: "Oi" }])).rejects.toThrow(
      NotImplementedException,
    );
  });
});
