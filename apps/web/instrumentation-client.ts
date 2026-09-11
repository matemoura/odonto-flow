import * as Sentry from "@sentry/nextjs";

/**
 * Mesma ideia do lado do navegador — precisa de `NEXT_PUBLIC_SENTRY_DSN`
 * (não `SENTRY_DSN`, que fica só no servidor) porque só variáveis com esse
 * prefixo entram no bundle enviado ao navegador. Sem ela, isso não faz nada.
 */
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 0.1,
  });
}
