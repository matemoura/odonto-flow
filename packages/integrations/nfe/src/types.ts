/**
 * Contrato do adapter de emissão de NFS-e. Implementações reais (fase 4):
 * Focus NFe, NFe.io ou eNotas — todos cobram mensalidade desde o 1º uso real
 * (ver plano, seção "Preços"), sem tier grátis permanente de produção.
 */
export interface ServiceInvoiceRequest {
  clinicId: string;
  transactionId: string;
  amountCents: number;
  description: string;
  customerDocument: string; // CPF/CNPJ do paciente/tomador
}

export interface ServiceInvoiceResult {
  externalId: string;
  status: "issued" | "processing" | "failed";
  pdfUrl?: string;
}

export interface NfeProvider {
  readonly providerName: string;
  issueServiceInvoice(request: ServiceInvoiceRequest): Promise<ServiceInvoiceResult>;
  cancelInvoice(externalId: string): Promise<void>;
}
