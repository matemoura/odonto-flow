import { Injectable, NotImplementedException } from "@nestjs/common";
import { ESignatureProvider, MockESignatureProvider, SignatureEnvelopeRequest } from "@odontoflow/integration-e-signature";
import { IntegrationsConfigService } from "./integrations-config.service";

@Injectable()
export class ESignatureGatewayService {
  private readonly mock = new MockESignatureProvider();

  constructor(private readonly config: IntegrationsConfigService) {}

  async resolveProvider(clinicId: string): Promise<ESignatureProvider> {
    const { providerName } = await this.config.requireReleased(clinicId, "E_SIGNATURE");
    if (providerName === "mock") {
      return this.mock;
    }
    throw new NotImplementedException(
      `Provedor de assinatura "${providerName}" ainda não está implementado — plugue Autentique/Clicksign/D4Sign em ESignatureGatewayService.`,
    );
  }

  async createEnvelope(clinicId: string, request: Omit<SignatureEnvelopeRequest, "clinicId">) {
    const provider = await this.resolveProvider(clinicId);
    return provider.createEnvelope({ clinicId, ...request });
  }
}
