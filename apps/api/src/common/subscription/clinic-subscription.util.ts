/** Só os campos que a checagem de assinatura precisa — evita acoplar ao tipo completo do Prisma. */
export type ClinicSubscriptionFields = {
  createdAt: Date;
  lastPaymentAt: Date | null;
  manuallySuspendedAt: Date | null;
};

export type ClinicSubscriptionStatus = {
  /** Bloqueada de qualquer forma (manual ou inadimplência) — é o que os guards checam. */
  blocked: boolean;
  manuallySuspended: boolean;
  /** Dias desde o último pagamento (ou desde a criação, se nunca pagou). Negativo nunca acontece. */
  daysSinceLastPayment: number;
  /** `blocked` só por estourar o prazo de carência — não inclui suspensão manual. */
  delinquent: boolean;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Pura por design (sem acesso a banco) — assim dá pra reusar no TenantGuard,
 * no login e na listagem do painel do dono sem duplicar a regra.
 */
export function getClinicSubscriptionStatus(
  clinic: ClinicSubscriptionFields,
  gracePeriodDays: number,
  now: Date = new Date(),
): ClinicSubscriptionStatus {
  const reference = clinic.lastPaymentAt ?? clinic.createdAt;
  const daysSinceLastPayment = Math.max(0, Math.floor((now.getTime() - reference.getTime()) / MS_PER_DAY));
  const delinquent = daysSinceLastPayment > gracePeriodDays;
  const manuallySuspended = clinic.manuallySuspendedAt !== null;

  return {
    blocked: manuallySuspended || delinquent,
    manuallySuspended,
    daysSinceLastPayment,
    delinquent,
  };
}
