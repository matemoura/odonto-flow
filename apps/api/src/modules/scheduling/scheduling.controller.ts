import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { Role } from "@odontoflow/db";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { TenantGuard } from "../../common/guards/tenant.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentTenant } from "../../common/decorators/current-tenant.decorator";
import { CurrentUser, type AuthenticatedUser } from "../../common/decorators/current-user.decorator";
import { SchedulingService } from "./scheduling.service";
import { CreateAppointmentDto } from "./dto/create-appointment.dto";
import { UpdateAppointmentStatusDto } from "./dto/update-appointment-status.dto";

@Controller("scheduling")
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Roles(Role.CLINIC_ADMIN, Role.DENTIST, Role.ASSISTANT, Role.ORG_ADMIN)
export class SchedulingController {
  constructor(private readonly scheduling: SchedulingService) {}

  /** `days` (opcional, padrão 1) traz vários dias de uma vez — é o que a tela da semana usa. */
  @Get("agenda")
  async getAgenda(
    @CurrentTenant() clinicId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query("date") date: string,
    @Query("days") days?: string,
  ) {
    const escopo = await this.scheduling.escopoDoProfissional(user, clinicId);
    return this.scheduling.getAgendaForRange(clinicId, date, days ? Number(days) : 1, escopo);
  }

  @Post("appointments")
  create(@CurrentTenant() clinicId: string, @Body() dto: CreateAppointmentDto) {
    return this.scheduling.createInternalAppointment(clinicId, dto);
  }

  @Patch("appointments/:id/status")
  updateStatus(
    @CurrentTenant() clinicId: string,
    @Param("id") id: string,
    @Body() dto: UpdateAppointmentStatusDto,
  ) {
    return this.scheduling.updateStatus(clinicId, id, dto.status);
  }
}
