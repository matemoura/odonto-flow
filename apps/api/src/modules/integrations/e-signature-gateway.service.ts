import { Injectable, NotImplementedException } from "@nestjs/common";
import { ESignatureProvider, MockESignatureProvider, SignatureEnvelopeRequest } from "@odontoflow/integration-e-signature";
import { PrismaService } from "../../database/prisma.service";

@Injectable()
export class ESignatureGatewayService {
  private readonly mock = new MockESignatureProvider();

  constructor(private readonly prisma: PrismaService) {}

  async resolveProvider(clinicId: string): Promise<ESignatureProvider> {
    const config = await this.prisma.integrationConfig.findUnique({
      where: { clinicId_kind: { clinicId, kind: "E_SIGNATURE" } },
    });
    if (!config || config.providerName === "mock") {
      return this.mock;
    }
    throw new NotImplementedException(
      `Provedor de assinatura "${config.providerName}" ainda não está implementado — plugue Autentique/Clicksign/D4Sign em ESignatureGatewayService.`,
    );
  }

  async createEnvelope(clinicId: string, request: Omit<SignatureEnvelopeRequest, "clinicId">) {
    const provider = await this.resolveProvider(clinicId);
    return provider.createEnvelope({ clinicId, ...request });
  }
}
