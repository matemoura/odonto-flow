import { createHash } from "node:crypto";
import { CreditScoreProvider, CreditScoreRequest, CreditScoreResult } from "./types";

/** Score determinístico fake (hash do CPF) — nunca usar para decisão real de crédito. */
export class MockCreditScoreProvider implements CreditScoreProvider {
  readonly providerName = "mock";

  async queryScore(request: CreditScoreRequest): Promise<CreditScoreResult> {
    const hash = createHash("sha256").update(request.patientCpf).digest();
    const score = hash.readUInt16BE(0) % 1001;
    const riskBand = score < 400 ? "high" : score < 700 ? "medium" : "low";

    return { score, riskBand, queriedAt: new Date() };
  }
}
