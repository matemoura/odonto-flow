import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
  SetMetadata,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Request } from "express";
import { Observable, tap } from "rxjs";
import { PrismaService } from "../../database/prisma.service";
import { AuthenticatedUser } from "../decorators/current-user.decorator";

export const AUDIT_ENTITY_KEY = "auditEntity";

/** Marca um handler para gerar entrada de auditoria (ex.: acesso a prontuário). */
export const AuditEntity = (entityType: string) => SetMetadata(AUDIT_ENTITY_KEY, entityType);

/**
 * Registra em AuditLog toda requisição bem-sucedida em um endpoint marcado com
 * @AuditEntity(...). Obrigatório em qualquer rota que leia/escreva
 * ClinicalRecord ou Document — ver plano, seção "Riscos" (LGPD).
 */
@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditLogInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const entityType = this.reflector.get<string | undefined>(AUDIT_ENTITY_KEY, context.getHandler());

    if (!entityType) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<
      Request & {
        tenantId?: string;
        user?: AuthenticatedUser;
        params: Record<string, string>;
        query: Record<string, string>;
      }
    >();
    const action = request.method.toLowerCase();

    return next.handle().pipe(
      tap((result) => {
        if (!request.tenantId) return;

        const entityId =
          request.params?.id ??
          request.query?.patientId ??
          (result as { id?: string; patientId?: string })?.id ??
          (result as { patientId?: string })?.patientId ??
          "unknown";

        // O `.catch` não é formalidade: `void` numa promise rejeitada é uma
        // unhandled rejection, e desde o Node 15 isso DERRUBA o processo. Um
        // Postgres serverless que hiberna (Neon suspende após ~5min ocioso)
        // faz a primeira gravação depois da soneca falhar — e a API inteira
        // caía por causa de um log.
        //
        // Registrar é obrigatório por LGPD, mas a resposta ao usuário já saiu
        // quando chegamos aqui: derrubar o processo não desfaz o acesso, só
        // tira o sistema do ar. O erro fica no log da aplicação (e no Sentry,
        // se configurado) para ser investigado.
        void this.prisma.auditLog
          .create({
            data: {
              clinicId: request.tenantId,
              actorId: request.user?.userId,
              entityType,
              entityId,
              action,
              ip: request.ip,
            },
          })
          .catch((erro: unknown) => {
            this.logger.error(
              `Falha ao gravar AuditLog (${entityType} ${entityId}, ${action}): ${
                erro instanceof Error ? erro.message : String(erro)
              }`,
            );
          });
      }),
    );
  }
}
