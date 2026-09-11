/**
 * Contrato do adapter de consulta de crédito/score (avaliação de risco para
 * parcelamento). Implementações reais (fase 4): Serasa Experian, Boa Vista
 * SCPC — exigem CNPJ + contrato comercial, sem tier grátis de produção.
 * Exige consentimento específico do paciente antes de consultar (LGPD).
 */
export interface CreditScoreRequest {
  clinicId: string;
  patientId: string;
  patientCpf: string;
  consentGivenAt: Date;
}

export interface CreditScoreResult {
  score: number; // 0-1000
  riskBand: "low" | "medium" | "high";
  queriedAt: Date;
}

export interface CreditScoreProvider {
  readonly providerName: string;
  queryScore(request: CreditScoreRequest): Promise<CreditScoreResult>;
}
