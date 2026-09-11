import { createParamDecorator, ExecutionContext } from "@nestjs/common";

/**
 * Retorna o clinicId resolvido pelo TenantGuard para a requisição atual.
 * Deve ser sempre usado nos services em vez de ler tenantId do body/query.
 */
export const CurrentTenant = createParamDecorator((_: unknown, ctx: ExecutionContext): string => {
  const request = ctx.switchToHttp().getRequest();
  return request.tenantId;
});
