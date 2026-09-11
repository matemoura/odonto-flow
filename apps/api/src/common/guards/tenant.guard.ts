import { CanActivate, ExecutionContext, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Request } from "express";
import { PrismaService } from "../../database/prisma.service";
import { AuthenticatedUser } from "../decorators/current-user.decorator";
import { getClinicSubscriptionStatus } from "../subscription/clinic-subscription.util";

/**
 * Resolve `req.tenantId` a partir do slug da clínica (subdomínio/header, ver
 * TenantContextMiddleware) e, se a rota estiver autenticada, garante que o
 * usuário atual tem um ClinicMembership para esse tenant — nunca confia em um
 * tenantId vindo do client. Deve rodar em toda rota que acessa dado de clínica.
 */
@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<
      Request & { tenantSlug?: string; tenantId?: string; user?: AuthenticatedUser }
    >();

    if (!request.tenantSlug) {
      throw new NotFoundException("Clínica não informada (slug ausente).");
    }

    const clinic = await this.prisma.clinic.findUnique({
      where: { slug: request.tenantSlug },
      select: { id: true, createdAt: true, lastPaymentAt: true, manuallySuspendedAt: true },
    });

    if (!clinic) {
      throw new NotFoundException("Clínica não encontrada.");
    }

    if (request.user) {
      const belongsToTenant = request.user.memberships.some((membership) => membership.clinicId === clinic.id);
      if (!belongsToTenant) {
        throw new ForbiddenException("Usuário não pertence a esta clínica.");
      }
    }

    // Bloqueia toda rota desta clínica (inclusive públicas, tipo agendamento) quando
    // suspensa manualmente ou inadimplente há mais dias que a carência da plataforma.
    const settings = await this.prisma.platformSettings.findUnique({ where: { id: "singleton" } });
    const gracePeriodDays = settings?.delinquencyGracePeriodDays ?? 14;
    const subscription = getClinicSubscriptionStatus(clinic, gracePeriodDays);
    if (subscription.blocked) {
      throw new ForbiddenException(
        subscription.manuallySuspended
          ? "Acesso desta clínica está suspenso. Entre em contato com o suporte."
          : "Assinatura em atraso — acesso suspenso. Entre em contato com o suporte pra regularizar.",
      );
    }

    request.tenantId = clinic.id;
    return true;
  }
}
