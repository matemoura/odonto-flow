import { Injectable, NotImplementedException } from "@nestjs/common";
import { CreditScoreProvider, CreditScoreRequest, MockCreditScoreProvider } from "@odontoflow/integration-credit-score";
import { IntegrationsConfigService } from "./integrations-config.service";

@Injectable()
export class CreditScoreGatewayService {
  private readonly mock = new MockCreditScoreProvider();

  constructor(private readonly config: IntegrationsConfigService) {}

  async resolveProvider(clinicId: string): Promise<CreditScoreProvider> {
    const { providerName } = await this.config.requireReleased(clinicId, "CREDIT_SCORE");
    if (providerName === "mock") {
      return this.mock;
    }
    throw new NotImplementedException(
      `Provedor de score "${providerName}" ainda não está implementado — plugue Serasa/Boa Vista em CreditScoreGatewayService (exige CNPJ+contrato comercial, ver plano).`,
    );
  }

  async queryScore(clinicId: string, request: Omit<CreditScoreRequest, "clinicId">) {
    const provider = await this.resolveProvider(clinicId);
    return provider.queryScore({ clinicId, ...request });
  }
}
