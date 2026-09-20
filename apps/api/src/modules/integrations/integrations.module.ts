import { Module } from "@nestjs/common";
import { IntegrationsConfigController } from "./integrations-config.controller";
import { IntegrationsConfigService } from "./integrations-config.service";
import { PlatformIntegrationsController } from "./platform-integrations.controller";
import { WhatsAppWebhookController } from "./whatsapp-webhook.controller";
import { WhatsAppGatewayService } from "./whatsapp-gateway.service";
import { AiAssistantGatewayService } from "./ai-assistant-gateway.service";
import { NfeGatewayService } from "./nfe-gateway.service";
import { ESignatureGatewayService } from "./e-signature-gateway.service";
import { CreditScoreGatewayService } from "./credit-score-gateway.service";

@Module({
  controllers: [IntegrationsConfigController, PlatformIntegrationsController, WhatsAppWebhookController],
  providers: [
    IntegrationsConfigService,
    WhatsAppGatewayService,
    AiAssistantGatewayService,
    NfeGatewayService,
    ESignatureGatewayService,
    CreditScoreGatewayService,
  ],
  exports: [WhatsAppGatewayService, AiAssistantGatewayService, NfeGatewayService, ESignatureGatewayService, CreditScoreGatewayService],
})
export class IntegrationsModule {}
