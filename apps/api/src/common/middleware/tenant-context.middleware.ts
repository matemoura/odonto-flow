import { Injectable, NestMiddleware } from "@nestjs/common";
import { NextFunction, Request, Response } from "express";

/**
 * Resolve o tenant (clinicId) da requisição e anexa em `req.tenantId`.
 *
 * Ordem de resolução: (1) subdomínio da clínica (ex. clinica-demo.dentista.app),
 * (2) header `x-clinic-slug` (usado no link público de agendamento), (3) claim
 * `clinicId` do JWT autenticado (setado depois pelo JwtStrategy em rotas logadas).
 * Módulos de negócio nunca devem confiar em tenantId vindo do body/query.
 */
@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction) {
    const subdomain = req.hostname?.split(".")[0];
    const headerSlug = req.header("x-clinic-slug");

    (req as Request & { tenantSlug?: string }).tenantSlug = headerSlug ?? subdomain ?? undefined;

    next();
  }
}
