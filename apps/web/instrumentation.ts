/**
 * Monitoramento de erro do lado do servidor — opcional, sem custo, sem conta
 * até você configurar. Só liga se `SENTRY_DSN` estiver definido; sem isso,
 * um erro em produção só aparece se alguém reclamar. Crie um projeto grátis
 * em sentry.io e defina a env var quando quiser ligar.
 */
export async function register() {
  if (!process.env.SENTRY_DSN) return;

  if (process.env.NEXT_RUNTIME === "nodejs") {
    const Sentry = await import("@sentry/nextjs");
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV ?? "development",
      tracesSampleRate: 0.1,
    });
  }
}
