import * as Sentry from "@sentry/node";

/**
 * Monitoramento de erro é opcional por padrão (sem custo, sem conta) — só
 * liga se `SENTRY_DSN` estiver configurado. Sem isso, um erro em produção só
 * aparece se alguém reclamar; crie uma conta grátis em sentry.io e defina a
 * env var quando quiser ligar.
 */
export function initSentry() {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? "development",
    tracesSampleRate: 0.1,
  });
}

export const sentryEnabled = () => Boolean(process.env.SENTRY_DSN);
