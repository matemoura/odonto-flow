import { Body, Controller, Delete, Get, HttpCode, Param, Post, Query, UseGuards } from "@nestjs/common";
import { Role } from "@odontoflow/db";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { TenantGuard } from "../../common/guards/tenant.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentTenant } from "../../common/decorators/current-tenant.decorator";
import { CertificatesService } from "./certificates.service";
import { CreateCertificateDto } from "./dto/create-certificate.dto";

@Controller("certificates")
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Roles(Role.CLINIC_ADMIN, Role.DENTIST, Role.ASSISTANT, Role.ORG_ADMIN)
export class CertificatesController {
  constructor(private readonly certificates: CertificatesService) {}

  @Get()
  list(@CurrentTenant() clinicId: string, @Query("patientId") patientId: string) {
    return this.certificates.listForPatient(clinicId, patientId);
  }

  @Get(":id")
  findOne(@CurrentTenant() clinicId: string, @Param("id") id: string) {
    return this.certificates.findOne(clinicId, id);
  }

  @Post()
  create(@CurrentTenant() clinicId: string, @Body() dto: CreateCertificateDto) {
    return this.certificates.create(clinicId, dto);
  }

  @Delete(":id")
  @HttpCode(204)
  remove(@CurrentTenant() clinicId: string, @Param("id") id: string) {
    return this.certificates.remove(clinicId, id);
  }
}
