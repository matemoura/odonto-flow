import { Body, Controller, Get, Param, Post, Query, UseGuards, UseInterceptors } from "@nestjs/common";
import { Role } from "@odontoflow/db";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { TenantGuard } from "../../common/guards/tenant.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentTenant } from "../../common/decorators/current-tenant.decorator";
import { CurrentUser, AuthenticatedUser } from "../../common/decorators/current-user.decorator";
import { AuditEntity, AuditLogInterceptor } from "../../common/interceptors/audit-log.interceptor";
import { FaceogramService } from "./faceogram.service";
import { CreateFacialPlanningDto } from "./dto/create-facial-planning.dto";

@Controller("faceogram")
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Roles(Role.CLINIC_ADMIN, Role.DENTIST, Role.ORG_ADMIN)
@UseInterceptors(AuditLogInterceptor)
export class FaceogramController {
  constructor(private readonly faceogram: FaceogramService) {}

  @Get()
  @AuditEntity("FacialPlanning")
  list(@CurrentTenant() clinicId: string, @Query("patientId") patientId: string) {
    return this.faceogram.listForPatient(clinicId, patientId);
  }

  @Get(":id")
  @AuditEntity("FacialPlanning")
  getOne(@CurrentTenant() clinicId: string, @Param("id") id: string) {
    return this.faceogram.getOne(clinicId, id);
  }

  @Post()
  @AuditEntity("FacialPlanning")
  create(
    @CurrentTenant() clinicId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateFacialPlanningDto,
  ) {
    return this.faceogram.create(clinicId, user.userId, dto);
  }
}
