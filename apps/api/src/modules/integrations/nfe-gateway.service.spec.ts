import { ForbiddenException, NotImplementedException } from "@nestjs/common";
import { NfeGatewayService } from "./nfe-gateway.service";
import { fakeConfigService } from "./integration-gateways.test-double";

const REQUEST = {
  transactionId: "tx-1",
  amountCents: 10000,
  description: "Restauração",
  customerDocument: "00000000000",
};

describe("NfeGatewayService", () => {
  // A ausência de liberação passou a fechar a porta. Antes ela valia como
  // "mock liberado", e toda clínica emitia nota sem ninguém ter decidido isso.
  it("recusa quando a integração não foi liberada para a clínica", async () => {
    const service = new NfeGatewayService(fakeConfigService(null));
    await expect(service.issueServiceInvoice("clinic-1", REQUEST)).rejects.toThrow(ForbiddenException);
  });

  it("usa o provedor mock quando a liberação é em modo mock", async () => {
    const service = new NfeGatewayService(fakeConfigService("mock"));
    const result = await service.issueServiceInvoice("clinic-1", REQUEST);
    expect(result.externalId).toBeDefined();
  });

  it("recusa um provedor real ainda não implementado", async () => {
    const service = new NfeGatewayService(fakeConfigService("focus-nfe"));
    await expect(service.issueServiceInvoice("clinic-1", REQUEST)).rejects.toThrow(NotImplementedException);
  });
});
