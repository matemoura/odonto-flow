/**
 * Contrato do adapter de assinatura eletrônica de contratos/termos de
 * consentimento. Implementações reais (fase 4): Autentique (tem free tier de
 * 5 docs/mês), Clicksign ou D4Sign.
 */
export interface SignatureEnvelopeRequest {
  clinicId: string;
  patientId: string;
  documentName: string;
  documentContent: string; // HTML/texto do contrato/termo
  signerName: string;
  signerEmail: string;
}

export interface SignatureEnvelopeStatus {
  externalEnvelopeId: string;
  status: "pending" | "signed" | "declined";
  signedAt?: Date;
}

export interface ESignatureProvider {
  readonly providerName: string;
  /** Provedores reais devem ter validade jurídica ICP-Brasil; o mock não tem. */
  createEnvelope(request: SignatureEnvelopeRequest): Promise<SignatureEnvelopeStatus>;
  getStatus(externalEnvelopeId: string): Promise<SignatureEnvelopeStatus>;
}
