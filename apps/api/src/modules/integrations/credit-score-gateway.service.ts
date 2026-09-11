import { Injectable, NotImplementedException } from "@nestjs/common";
import { CreditScoreProvider, CreditScoreRequest, MockCreditScoreProvider } from "@odontoflow/integration-credit-score";
import { PrismaService } from "../../database/prisma.service";

@Injectable()
export class CreditScoreGatewayService {
  private readonly mock = new MockCreditScoreProvider();

  constructor(private readonly prisma: PrismaService) {}

  async resolveProvider(clinicId: string): Promise<CreditScoreProvider> {
    const config = await this.prisma.integrationConfig.findUnique({
      where: { clinicId_kind: { clinicId, kind: "CREDIT_SCORE" } },
    });
    if (!config || config.providerName === "mock") {
      return this.mock;
    }
    throw new NotImplementedException(
      `Provedor de score "${config.providerName}" ainda não está implementado — plugue Serasa/Boa Vista em CreditScoreGatewayService (exige CNPJ+contrato comercial, ver plano).`,
    );
  }

  async queryScore(clinicId: string, request: Omit<CreditScoreRequest, "clinicId">) {
    const provider = await this.resolveProvider(clinicId);
    return provider.queryScore({ clinicId, ...request });
  }
}
