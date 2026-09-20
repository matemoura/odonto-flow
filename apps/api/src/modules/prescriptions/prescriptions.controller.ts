import { Body, Controller, Get, Param, Post, Query, UseGuards, UseInterceptors } from "@nestjs/common";
import { Role } from "@odontoflow/db";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { TenantGuard } from "../../common/guards/tenant.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentTenant } from "../../common/decorators/current-tenant.decorator";
import { CurrentUser, AuthenticatedUser } from "../../common/decorators/current-user.decorator";
import { AuditEntity, AuditLogInterceptor } from "../../common/interceptors/audit-log.interceptor";
import { PrescriptionsService } from "./prescriptions.service";
import { CreatePrescriptionDto } from "./dto/create-prescription.dto";

@Controller("prescriptions")
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Roles(Role.CLINIC_ADMIN, Role.DENTIST, Role.ORG_ADMIN)
@UseInterceptors(AuditLogInterceptor)
export class PrescriptionsController {
  constructor(private readonly prescriptions: PrescriptionsService) {}

  @Get()
  @AuditEntity("Prescription")
  list(@CurrentTenant() clinicId: string, @Query("patientId") patientId: string) {
    return this.prescriptions.listForPatient(clinicId, patientId);
  }

  @Get(":id")
  @AuditEntity("Prescription")
  findOne(@CurrentTenant() clinicId: string, @Param("id") id: string) {
    return this.prescriptions.findOne(clinicId, id);
  }

  @Post()
  @AuditEntity("Prescription")
  create(
    @CurrentTenant() clinicId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePrescriptionDto,
  ) {
    return this.prescriptions.create(clinicId, user.userId, dto);
  }
}
