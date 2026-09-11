import { NotImplementedException } from "@nestjs/common";
import { ESignatureGatewayService } from "./e-signature-gateway.service";
import { PrismaService } from "../../database/prisma.service";

function fakePrisma(config: { providerName: string } | null) {
  return {
    integrationConfig: { findUnique: jest.fn().mockResolvedValue(config) },
  } as unknown as PrismaService;
}

const REQUEST = {
  patientId: "patient-1",
  documentName: "Termo",
  documentContent: "conteúdo",
  signerName: "Fulano",
  signerEmail: "fulano@example.com",
};

describe("ESignatureGatewayService", () => {
  it("usa o provedor mock quando não há configuração salva", async () => {
    const service = new ESignatureGatewayService(fakePrisma(null));
    const envelope = await service.createEnvelope("clinic-1", REQUEST);
    expect(envelope.externalEnvelopeId).toBeDefined();
  });

  it("usa o provedor mock quando a configuração diz explicitamente 'mock'", async () => {
    const service = new ESignatureGatewayService(fakePrisma({ providerName: "mock" }));
    await expect(service.createEnvelope("clinic-1", REQUEST)).resolves.toBeDefined();
  });

  it("recusa um provedor real ainda não implementado", async () => {
    const service = new ESignatureGatewayService(fakePrisma({ providerName: "autentique" }));
    await expect(service.createEnvelope("clinic-1", REQUEST)).rejects.toThrow(NotImplementedException);
  });
});
