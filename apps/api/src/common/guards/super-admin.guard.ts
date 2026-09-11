import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { AuthenticatedUser } from "../decorators/current-user.decorator";

/**
 * Restringe a rota ao dono da plataforma — sem nenhuma clínica envolvida
 * (não usa TenantGuard/RolesGuard, que são sempre por tenant). Só passa
 * `JwtAuthGuard` (token válido) + este guard (`user.isSuperAdmin === true`).
 */
@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
    if (!request.user?.isSuperAdmin) {
      throw new ForbiddenException("Acesso restrito ao administrador da plataforma.");
    }
    return true;
  }
}
