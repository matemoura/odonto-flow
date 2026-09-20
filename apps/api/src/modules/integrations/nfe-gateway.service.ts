import { Injectable, NotImplementedException } from "@nestjs/common";
import { MockNfeProvider, NfeProvider, ServiceInvoiceRequest } from "@odontoflow/integration-nfe";
import { IntegrationsConfigService } from "./integrations-config.service";

@Injectable()
export class NfeGatewayService {
  private readonly mock = new MockNfeProvider();

  constructor(private readonly config: IntegrationsConfigService) {}

  async resolveProvider(clinicId: string): Promise<NfeProvider> {
    const { providerName } = await this.config.requireReleased(clinicId, "NFE");
    if (providerName === "mock") {
      return this.mock;
    }
    throw new NotImplementedException(
      `Provedor de NFe "${providerName}" ainda não está implementado — plugue Focus NFe/NFe.io/eNotas em NfeGatewayService (todos são pagos desde o 1º uso, ver plano).`,
    );
  }

  async issueServiceInvoice(clinicId: string, request: Omit<ServiceInvoiceRequest, "clinicId">) {
    const provider = await this.resolveProvider(clinicId);
    return provider.issueServiceInvoice({ clinicId, ...request });
  }
}
