import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Request } from "express";
import { Role } from "@odontoflow/db";
import { ROLES_KEY } from "../decorators/roles.decorator";
import { AuthenticatedUser } from "../decorators/current-user.decorator";

/** Deve rodar depois do TenantGuard (precisa de req.tenantId já resolvido). */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request & { tenantId?: string; user?: AuthenticatedUser }>();
    const membership = request.user?.memberships.find((m) => m.clinicId === request.tenantId);

    if (!membership || !requiredRoles.includes(membership.role as Role)) {
      throw new ForbiddenException("Papel do usuário não autorizado para esta ação.");
    }

    return true;
  }
}
