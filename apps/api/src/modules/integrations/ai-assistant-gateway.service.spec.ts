import { ForbiddenException, NotImplementedException } from "@nestjs/common";
import { AiAssistantGatewayService } from "./ai-assistant-gateway.service";
import { fakeConfigService } from "./integration-gateways.test-double";

const MESSAGES = [{ role: "user" as const, content: "Oi" }];

describe("AiAssistantGatewayService", () => {
  it("recusa quando a integração não foi liberada para a clínica", async () => {
    const service = new AiAssistantGatewayService(fakeConfigService(null));
    await expect(service.chat("clinic-1", MESSAGES)).rejects.toThrow(ForbiddenException);
  });

  it("usa o provedor mock quando a liberação é em modo mock", async () => {
    const service = new AiAssistantGatewayService(fakeConfigService("mock"));
    const reply = await service.chat("clinic-1", MESSAGES);
    expect(typeof reply).toBe("string");
    expect(reply.length).toBeGreaterThan(0);
  });

  it("recusa um provedor real ainda não implementado", async () => {
    const service = new AiAssistantGatewayService(fakeConfigService("claude"));
    await expect(service.chat("clinic-1", MESSAGES)).rejects.toThrow(NotImplementedException);
  });
});
