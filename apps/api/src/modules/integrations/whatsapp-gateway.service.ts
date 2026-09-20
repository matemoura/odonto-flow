import { Injectable, Logger, NotImplementedException } from "@nestjs/common";
import { MockWhatsAppProvider, WhatsAppProvider } from "@odontoflow/integration-whatsapp";
import { IntegrationsConfigService } from "./integrations-config.service";

@Injectable()
export class WhatsAppGatewayService {
  private readonly logger = new Logger(WhatsAppGatewayService.name);
  private readonly mock = new MockWhatsAppProvider();

  constructor(private readonly config: IntegrationsConfigService) {}

  /** Só a implementação "mock" existe nesta versão — plugar um BSP real aqui quando a clínica contratar um. */
  async resolveProvider(clinicId: string): Promise<WhatsAppProvider> {
    const { providerName } = await this.config.requireReleased(clinicId, "WHATSAPP");
    if (providerName === "mock") {
      return this.mock;
    }
    throw new NotImplementedException(
      `Provedor de WhatsApp "${providerName}" ainda não está implementado — plugue a Meta Cloud API ou um BSP em WhatsAppGatewayService.`,
    );
  }

  async sendTemplateMessage(
    clinicId: string,
    phone: string,
    templateName: string,
    variables: Record<string, string>,
  ) {
    const provider = await this.resolveProvider(clinicId);
    // O remetente é decisão da clínica, não da plataforma: sem número dela, o
    // envio para antes de sair de um número que o paciente não reconheceria.
    const fromPhoneE164 = await this.config.requireWhatsAppSender(clinicId);
    const result = await provider.sendTemplateMessage({
      clinicId,
      fromPhoneE164,
      toPhoneE164: phone,
      templateName,
      variables,
    });
    this.logger.log(`[${provider.providerName}] "${templateName}" enviado para ${phone} — externalId=${result.externalId}`);
    return result;
  }

  async sendAppointmentConfirmation(
    clinicId: string,
    phone: string,
    variables: { patientName: string; whenLabel: string; professionalName: string },
  ) {
    return this.sendTemplateMessage(clinicId, phone, "appointment_confirmation", variables);
  }
}
