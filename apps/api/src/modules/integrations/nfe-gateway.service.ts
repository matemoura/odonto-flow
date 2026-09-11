import { Injectable, NotImplementedException } from "@nestjs/common";
import { MockNfeProvider, NfeProvider, ServiceInvoiceRequest } from "@odontoflow/integration-nfe";
import { PrismaService } from "../../database/prisma.service";

@Injectable()
export class NfeGatewayService {
  private readonly mock = new MockNfeProvider();

  constructor(private readonly prisma: PrismaService) {}

  async resolveProvider(clinicId: string): Promise<NfeProvider> {
    const config = await this.prisma.integrationConfig.findUnique({
      where: { clinicId_kind: { clinicId, kind: "NFE" } },
    });
    if (!config || config.providerName === "mock") {
      return this.mock;
    }
    throw new NotImplementedException(
      `Provedor de NFe "${config.providerName}" ainda não está implementado — plugue Focus NFe/NFe.io/eNotas em NfeGatewayService (todos são pagos desde o 1º uso, ver plano).`,
    );
  }

  async issueServiceInvoice(clinicId: string, request: Omit<ServiceInvoiceRequest, "clinicId">) {
    const provider = await this.resolveProvider(clinicId);
    return provider.issueServiceInvoice({ clinicId, ...request });
  }
}
