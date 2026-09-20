import { Injectable, NotImplementedException } from "@nestjs/common";
import { AiAssistantProvider, ChatMessage, MockAiAssistantProvider } from "@odontoflow/integration-ai-assistant";
import { IntegrationsConfigService } from "./integrations-config.service";

@Injectable()
export class AiAssistantGatewayService {
  private readonly mock = new MockAiAssistantProvider();

  constructor(private readonly config: IntegrationsConfigService) {}

  async resolveProvider(clinicId: string): Promise<AiAssistantProvider> {
    const { providerName } = await this.config.requireReleased(clinicId, "AI_ASSISTANT");
    if (providerName === "mock") {
      return this.mock;
    }
    throw new NotImplementedException(
      `Provedor de IA "${providerName}" ainda não está implementado — plugue Claude/OpenAI/Gemini em AiAssistantGatewayService.`,
    );
  }

  async chat(clinicId: string, messages: ChatMessage[]): Promise<string> {
    const provider = await this.resolveProvider(clinicId);
    return provider.chat(messages);
  }
}
