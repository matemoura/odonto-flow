import { ArgumentsHost, Catch, HttpException } from "@nestjs/common";
import { BaseExceptionFilter } from "@nestjs/core";
import * as Sentry from "@sentry/node";
import { sentryEnabled } from "../observability/sentry";

/**
 * Só reporta pro Sentry o que é bug/infra de verdade (exceção não tratada,
 * ou HttpException 5xx) — nunca 4xx esperado (senha errada, paciente não
 * encontrado, validação), senão o Sentry vira ruído. Comportamento da
 * resposta HTTP continua idêntico (delega pro filtro padrão do Nest depois).
 */
@Catch()
export class SentryExceptionsFilter extends BaseExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    if (sentryEnabled()) {
      const isExpectedHttpError = exception instanceof HttpException && exception.getStatus() < 500;
      if (!isExpectedHttpError) {
        Sentry.captureException(exception);
      }
    }
    super.catch(exception, host);
  }
}
