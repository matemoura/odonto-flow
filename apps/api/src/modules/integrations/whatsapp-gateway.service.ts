import { Injectable, Logger, NotImplementedException } from "@nestjs/common";
import { MockWhatsAppProvider, WhatsAppProvider } from "@odontoflow/integration-whatsapp";
import { PrismaService } from "../../database/prisma.service";

@Injectable()
export class WhatsAppGatewayService {
  private readonly logger = new Logger(WhatsAppGatewayService.name);
  private readonly mock = new MockWhatsAppProvider();

  constructor(private readonly prisma: PrismaService) {}

  /** Só a implementação "mock" existe nesta versão — plugar um BSP real aqui quando a clínica contratar um. */
  async resolveProvider(clinicId: string): Promise<WhatsAppProvider> {
    const config = await this.prisma.integrationConfig.findUnique({
      where: { clinicId_kind: { clinicId, kind: "WHATSAPP" } },
    });
    if (!config || config.providerName === "mock") {
      return this.mock;
    }
    throw new NotImplementedException(
      `Provedor de WhatsApp "${config.providerName}" ainda não está implementado — plugue a Meta Cloud API ou um BSP em WhatsAppGatewayService.`,
    );
  }

  async sendTemplateMessage(
    clinicId: string,
    phone: string,
    templateName: string,
    variables: Record<string, string>,
  ) {
    const provider = await this.resolveProvider(clinicId);
    const result = await provider.sendTemplateMessage({ clinicId, toPhoneE164: phone, templateName, variables });
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
