import { Controller, Get, UseGuards } from "@nestjs/common";
import { Role } from "@odontoflow/db";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { TenantGuard } from "../../common/guards/tenant.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentTenant } from "../../common/decorators/current-tenant.decorator";
import { CurrentUser, AuthenticatedUser } from "../../common/decorators/current-user.decorator";
import { PrismaService } from "../../database/prisma.service";

/** Endpoints do portal do paciente — cada rota só enxerga os dados do próprio paciente (req.user.patientId). */
@Controller("portal")
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Roles(Role.PATIENT)
export class PortalController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("appointments")
  async myAppointments(@CurrentTenant() clinicId: string, @CurrentUser() user: AuthenticatedUser) {
    const appointments = await this.prisma.appointment.findMany({
      where: { clinicId, patientId: user.patientId },
      include: { professional: { select: { user: { select: { name: true } } } } },
      orderBy: { startAt: "desc" },
    });

    const now = new Date();
    const upcoming = appointments
      .filter((a) => a.startAt >= now && a.status !== "CANCELLED")
      .sort((a, b) => a.startAt.getTime() - b.startAt.getTime())[0];
    const history = appointments.filter((a) => a !== upcoming && a.startAt < now);

    return { upcoming: upcoming ?? null, history };
  }
}
