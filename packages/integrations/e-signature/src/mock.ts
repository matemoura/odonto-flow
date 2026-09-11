import { randomUUID, createHash } from "node:crypto";
import { ESignatureProvider, SignatureEnvelopeRequest, SignatureEnvelopeStatus } from "./types";

/**
 * Captura nome digitado + timestamp + hash local. ⚠️ Sem validade jurídica
 * ICP-Brasil — a UI deve deixar isso explícito ao usuário (ver plano, riscos).
 */
export class MockESignatureProvider implements ESignatureProvider {
  readonly providerName = "mock";
  private readonly envelopes = new Map<string, SignatureEnvelopeStatus>();

  async createEnvelope(request: SignatureEnvelopeRequest): Promise<SignatureEnvelopeStatus> {
    const externalEnvelopeId = randomUUID();
    const hash = createHash("sha256")
      .update(`${request.signerName}:${request.documentContent}:${Date.now()}`)
      .digest("hex");

    const status: SignatureEnvelopeStatus = {
      externalEnvelopeId,
      status: "signed",
      signedAt: new Date(),
    };

    this.envelopes.set(externalEnvelopeId, status);
    void hash; // guardado só para depuração local, não é uma assinatura válida

    return status;
  }

  async getStatus(externalEnvelopeId: string): Promise<SignatureEnvelopeStatus> {
    const status = this.envelopes.get(externalEnvelopeId);
    if (!status) {
      throw new Error("Envelope não encontrado.");
    }
    return status;
  }
}
