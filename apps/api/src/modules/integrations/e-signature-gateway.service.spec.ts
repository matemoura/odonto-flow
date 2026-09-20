import { ForbiddenException, NotImplementedException } from "@nestjs/common";
import { ESignatureGatewayService } from "./e-signature-gateway.service";
import { fakeConfigService } from "./integration-gateways.test-double";

const REQUEST = {
  patientId: "patient-1",
  documentName: "Termo",
  documentContent: "conteúdo",
  signerName: "Fulano",
  signerEmail: "fulano@example.com",
};

describe("ESignatureGatewayService", () => {
  it("recusa quando a integração não foi liberada para a clínica", async () => {
    const service = new ESignatureGatewayService(fakeConfigService(null));
    await expect(service.createEnvelope("clinic-1", REQUEST)).rejects.toThrow(ForbiddenException);
  });

  it("usa o provedor mock quando a liberação é em modo mock", async () => {
    const service = new ESignatureGatewayService(fakeConfigService("mock"));
    const envelope = await service.createEnvelope("clinic-1", REQUEST);
    expect(envelope.externalEnvelopeId).toBeDefined();
  });

  it("recusa um provedor real ainda não implementado", async () => {
    const service = new ESignatureGatewayService(fakeConfigService("autentique"));
    await expect(service.createEnvelope("clinic-1", REQUEST)).rejects.toThrow(NotImplementedException);
  });
});
