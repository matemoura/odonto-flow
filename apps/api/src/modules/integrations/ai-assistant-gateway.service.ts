import { Injectable, NotImplementedException } from "@nestjs/common";
import { AiAssistantProvider, ChatMessage, MockAiAssistantProvider } from "@odontoflow/integration-ai-assistant";
import { PrismaService } from "../../database/prisma.service";

@Injectable()
export class AiAssistantGatewayService {
  private readonly mock = new MockAiAssistantProvider();

  constructor(private readonly prisma: PrismaService) {}

  async resolveProvider(clinicId: string): Promise<AiAssistantProvider> {
    const config = await this.prisma.integrationConfig.findUnique({
      where: { clinicId_kind: { clinicId, kind: "AI_ASSISTANT" } },
    });
    if (!config || config.providerName === "mock") {
      return this.mock;
    }
    throw new NotImplementedException(
      `Provedor de IA "${config.providerName}" ainda não está implementado — plugue Claude/OpenAI/Gemini em AiAssistantGatewayService.`,
    );
  }

  async chat(clinicId: string, messages: ChatMessage[]): Promise<string> {
    const provider = await this.resolveProvider(clinicId);
    return provider.chat(messages);
  }
}
