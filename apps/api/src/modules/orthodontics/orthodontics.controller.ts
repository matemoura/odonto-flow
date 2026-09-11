import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards, UseInterceptors } from "@nestjs/common";
import { Role } from "@odontoflow/db";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { TenantGuard } from "../../common/guards/tenant.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentTenant } from "../../common/decorators/current-tenant.decorator";
import { AuditEntity, AuditLogInterceptor } from "../../common/interceptors/audit-log.interceptor";
import { OrthodonticsService } from "./orthodontics.service";
import { CreateTreatmentDto } from "./dto/create-treatment.dto";
import { AddStepDto } from "./dto/add-step.dto";
import { UpdateStepStatusDto } from "./dto/update-step-status.dto";
import { UpdateTreatmentStatusDto } from "./dto/update-treatment-status.dto";

@Controller("orthodontics")
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Roles(Role.CLINIC_ADMIN, Role.DENTIST, Role.ASSISTANT, Role.ORG_ADMIN)
@UseInterceptors(AuditLogInterceptor)
export class OrthodonticsController {
  constructor(private readonly orthodontics: OrthodonticsService) {}

  @Get("treatments")
  @AuditEntity("OrthodonticTreatment")
  list(@CurrentTenant() clinicId: string, @Query("patientId") patientId: string) {
    return this.orthodontics.listForPatient(clinicId, patientId);
  }

  @Get("treatments/:id")
  @AuditEntity("OrthodonticTreatment")
  getOne(@CurrentTenant() clinicId: string, @Param("id") id: string) {
    return this.orthodontics.getOne(clinicId, id);
  }

  @Post("treatments")
  @AuditEntity("OrthodonticTreatment")
  create(@CurrentTenant() clinicId: string, @Body() dto: CreateTreatmentDto) {
    return this.orthodontics.create(clinicId, dto);
  }

  @Patch("treatments/:id/status")
  @AuditEntity("OrthodonticTreatment")
  updateTreatmentStatus(
    @CurrentTenant() clinicId: string,
    @Param("id") id: string,
    @Body() dto: UpdateTreatmentStatusDto,
  ) {
    return this.orthodontics.updateTreatmentStatus(clinicId, id, dto);
  }

  @Post("treatments/:id/steps")
  @AuditEntity("OrthodonticTreatment")
  addStep(@CurrentTenant() clinicId: string, @Param("id") id: string, @Body() dto: AddStepDto) {
    return this.orthodontics.addStep(clinicId, id, dto);
  }

  @Patch("steps/:id/status")
  @AuditEntity("OrthodonticTreatment")
  updateStepStatus(@CurrentTenant() clinicId: string, @Param("id") id: string, @Body() dto: UpdateStepStatusDto) {
    return this.orthodontics.updateStepStatus(clinicId, id, dto);
  }
}
