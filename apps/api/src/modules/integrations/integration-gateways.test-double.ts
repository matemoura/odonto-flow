import { ForbiddenException } from "@nestjs/common";
import { IntegrationsConfigService } from "./integrations-config.service";

/**
 * Dublê do serviço de configuração para os testes de gateway. `providerName`
 * nulo é integração NÃO liberada — o mesmo `ForbiddenException` que o serviço
 * de verdade levanta, para os gateways serem testados contra o contrato real.
 */
export function fakeConfigService(providerName: string | null, whatsappSender: string | null = "+5511900000000") {
  return {
    requireReleased: jest.fn(async () => {
      if (providerName === null) {
        throw new ForbiddenException("A integração não está liberada para esta clínica.");
      }
      return { providerName };
    }),
    requireWhatsAppSender: jest.fn(async () => {
      if (whatsappSender === null) {
        throw new ForbiddenException("A clínica ainda não informou o número de WhatsApp dela.");
      }
      return whatsappSender;
    }),
  } as unknown as IntegrationsConfigService;
}
