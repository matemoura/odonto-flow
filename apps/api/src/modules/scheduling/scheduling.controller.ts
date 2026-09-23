import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put, Query, UseGuards } from "@nestjs/common";
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
import { UpdateSchedulingSettingsDto } from "./dto/update-scheduling-settings.dto";
import { CreateAppointmentLabelDto } from "./dto/create-appointment-label.dto";
import { UpdateAppointmentLabelDto } from "./dto/update-appointment-label.dto";
import { AssignAppointmentLabelDto } from "./dto/assign-appointment-label.dto";

@Controller("scheduling")
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Roles(Role.CLINIC_ADMIN, Role.DENTIST, Role.ASSISTANT, Role.ORG_ADMIN)
export class SchedulingController {
  constructor(private readonly scheduling: SchedulingService) {}

  /**
   * Dias de atendimento da clínica. A leitura é liberada para toda a equipe
   * (quem monta agenda precisa saber quando a clínica abre); só admin altera.
   */
  @Get("settings")
  getSettings(@CurrentTenant() clinicId: string) {
    return this.scheduling.getSchedulingSettings(clinicId);
  }

  @Put("settings")
  @Roles(Role.CLINIC_ADMIN, Role.ORG_ADMIN)
  updateSettings(@CurrentTenant() clinicId: string, @Body() dto: UpdateSchedulingSettingsDto) {
    return this.scheduling.updateSchedulingSettings(clinicId, dto);
  }

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

  /** Catálogo de rótulos (leitura liberada pra equipe toda, edição só admin). */
  @Get("labels")
  listLabels(@CurrentTenant() clinicId: string) {
    return this.scheduling.listLabels(clinicId);
  }

  @Post("labels")
  @Roles(Role.CLINIC_ADMIN, Role.ORG_ADMIN)
  createLabel(@CurrentTenant() clinicId: string, @Body() dto: CreateAppointmentLabelDto) {
    return this.scheduling.createLabel(clinicId, dto);
  }

  @Patch("labels/:id")
  @Roles(Role.CLINIC_ADMIN, Role.ORG_ADMIN)
  updateLabel(@CurrentTenant() clinicId: string, @Param("id") id: string, @Body() dto: UpdateAppointmentLabelDto) {
    return this.scheduling.updateLabel(clinicId, id, dto);
  }

  @Delete("labels/:id")
  @HttpCode(204)
  @Roles(Role.CLINIC_ADMIN, Role.ORG_ADMIN)
  removeLabel(@CurrentTenant() clinicId: string, @Param("id") id: string) {
    return this.scheduling.removeLabel(clinicId, id);
  }

  /** Aplicar/tirar um rótulo de uma consulta — qualquer papel da equipe pode. */
  @Patch("appointments/:id/label")
  assignLabel(@CurrentTenant() clinicId: string, @Param("id") id: string, @Body() dto: AssignAppointmentLabelDto) {
    return this.scheduling.assignLabel(clinicId, id, dto);
  }
}
