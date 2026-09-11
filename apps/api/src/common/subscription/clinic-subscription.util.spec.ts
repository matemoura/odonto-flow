import { getClinicSubscriptionStatus } from "./clinic-subscription.util";

const NOW = new Date("2026-09-15T12:00:00Z");

describe("getClinicSubscriptionStatus", () => {
  it("não bloqueia quando o último pagamento está dentro do prazo de carência", () => {
    const status = getClinicSubscriptionStatus(
      {
        createdAt: new Date("2026-01-01"),
        lastPaymentAt: new Date("2026-09-10T12:00:00Z"), // 5 dias atrás
        manuallySuspendedAt: null,
      },
      14,
      NOW,
    );

    expect(status.blocked).toBe(false);
    expect(status.delinquent).toBe(false);
    expect(status.daysSinceLastPayment).toBe(5);
  });

  it("bloqueia por inadimplência quando passa do prazo de carência", () => {
    const status = getClinicSubscriptionStatus(
      {
        createdAt: new Date("2026-01-01"),
        lastPaymentAt: new Date("2026-08-01T12:00:00Z"), // 45 dias atrás
        manuallySuspendedAt: null,
      },
      14,
      NOW,
    );

    expect(status.blocked).toBe(true);
    expect(status.delinquent).toBe(true);
    expect(status.manuallySuspended).toBe(false);
    expect(status.daysSinceLastPayment).toBe(45);
  });

  it("conta a carência a partir da criação quando a clínica nunca pagou", () => {
    const status = getClinicSubscriptionStatus(
      {
        createdAt: new Date("2026-09-01T12:00:00Z"), // 14 dias atrás
        lastPaymentAt: null,
        manuallySuspendedAt: null,
      },
      14,
      NOW,
    );

    expect(status.delinquent).toBe(false); // exatamente no limite, ainda não passou
    expect(status.daysSinceLastPayment).toBe(14);
  });

  it("bloqueia por suspensão manual mesmo com pagamento em dia", () => {
    const status = getClinicSubscriptionStatus(
      {
        createdAt: new Date("2026-01-01"),
        lastPaymentAt: NOW,
        manuallySuspendedAt: new Date("2026-09-14"),
      },
      14,
      NOW,
    );

    expect(status.blocked).toBe(true);
    expect(status.manuallySuspended).toBe(true);
    expect(status.delinquent).toBe(false);
  });
});
