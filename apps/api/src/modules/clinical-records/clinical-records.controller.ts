import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put, Query, UseGuards, UseInterceptors } from "@nestjs/common";
import { Role } from "@odontoflow/db";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { TenantGuard } from "../../common/guards/tenant.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentTenant } from "../../common/decorators/current-tenant.decorator";
import { CurrentUser, AuthenticatedUser } from "../../common/decorators/current-user.decorator";
import { AuditEntity, AuditLogInterceptor } from "../../common/interceptors/audit-log.interceptor";
import { ClinicalRecordsService } from "./clinical-records.service";
import { CreateClinicalRecordDto } from "./dto/create-clinical-record.dto";
import { UpsertOdontogramEntryDto } from "./dto/upsert-odontogram-entry.dto";
import { UpsertPeriodontalEntryDto } from "./dto/upsert-periodontal-entry.dto";
import { UpsertAnamnesisDto } from "./dto/upsert-anamnesis.dto";
import { CreateTreatmentPlanOptionDto } from "./dto/create-treatment-plan-option.dto";
import { UpdateTreatmentPlanOptionDto } from "./dto/update-treatment-plan-option.dto";

@Controller("clinical-records")
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Roles(Role.CLINIC_ADMIN, Role.DENTIST, Role.ORG_ADMIN)
@UseInterceptors(AuditLogInterceptor)
export class ClinicalRecordsController {
  constructor(private readonly records: ClinicalRecordsService) {}

  @Get()
  @AuditEntity("ClinicalRecord")
  list(@CurrentTenant() clinicId: string, @Query("patientId") patientId: string) {
    return this.records.listForPatient(clinicId, patientId);
  }

  @Post()
  @AuditEntity("ClinicalRecord")
  create(
    @CurrentTenant() clinicId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateClinicalRecordDto,
  ) {
    return this.records.create(clinicId, user.userId, dto);
  }

  @Get("odontogram")
  @AuditEntity("Odontogram")
  getOdontogram(@CurrentTenant() clinicId: string, @Query("patientId") patientId: string) {
    return this.records.getOdontogram(clinicId, patientId);
  }

  @Put("odontogram")
  @AuditEntity("Odontogram")
  upsertOdontogramEntry(
    @CurrentTenant() clinicId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpsertOdontogramEntryDto,
  ) {
    return this.records.upsertOdontogramEntry(clinicId, user.userId, dto);
  }

  @Get("periodontogram")
  @AuditEntity("PeriodontalEntry")
  getPeriodontogram(@CurrentTenant() clinicId: string, @Query("patientId") patientId: string) {
    return this.records.getPeriodontogram(clinicId, patientId);
  }

  @Put("periodontogram")
  @AuditEntity("PeriodontalEntry")
  upsertPeriodontalEntry(
    @CurrentTenant() clinicId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpsertPeriodontalEntryDto,
  ) {
    return this.records.upsertPeriodontalEntry(clinicId, user.userId, dto);
  }

  @Get("anamnesis")
  @AuditEntity("Anamnesis")
  getAnamnesis(@CurrentTenant() clinicId: string, @Query("patientId") patientId: string) {
    return this.records.getAnamnesis(clinicId, patientId);
  }

  @Put("anamnesis")
  @AuditEntity("Anamnesis")
  upsertAnamnesis(
    @CurrentTenant() clinicId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpsertAnamnesisDto,
  ) {
    return this.records.upsertAnamnesis(clinicId, user.userId, dto);
  }

  @Get("treatment-plan-options")
  listTreatmentPlanOptions(@CurrentTenant() clinicId: string, @Query("patientId") patientId: string) {
    return this.records.listTreatmentPlanOptions(clinicId, patientId);
  }

  @Post("treatment-plan-options")
  createTreatmentPlanOption(@CurrentTenant() clinicId: string, @Body() dto: CreateTreatmentPlanOptionDto) {
    return this.records.createTreatmentPlanOption(clinicId, dto);
  }

  @Patch("treatment-plan-options/:id")
  updateTreatmentPlanOption(
    @CurrentTenant() clinicId: string,
    @Param("id") id: string,
    @Body() dto: UpdateTreatmentPlanOptionDto,
  ) {
    return this.records.updateTreatmentPlanOption(clinicId, id, dto);
  }

  @Delete("treatment-plan-options/:id")
  @HttpCode(204)
  removeTreatmentPlanOption(@CurrentTenant() clinicId: string, @Param("id") id: string) {
    return this.records.removeTreatmentPlanOption(clinicId, id);
  }
}
