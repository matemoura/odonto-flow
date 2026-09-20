import { Controller, Get, UseGuards, UseInterceptors } from "@nestjs/common";
import { Role } from "@odontoflow/db";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { TenantGuard } from "../../common/guards/tenant.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { AuditEntity, AuditLogInterceptor } from "../../common/interceptors/audit-log.interceptor";
import { PrescriptionsService } from "./prescriptions.service";

/// Catálogo global de medicamentos — não tem `clinicId` (é referência
/// farmacológica, igual pra todas as clínicas), mas continua exigindo sessão
/// autenticada de staff (`TenantGuard` só valida o slug/token, não filtra
/// nada por clínica aqui).
@Controller("medications")
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Roles(Role.CLINIC_ADMIN, Role.DENTIST, Role.ASSISTANT, Role.ORG_ADMIN)
@UseInterceptors(AuditLogInterceptor)
export class MedicationsController {
  constructor(private readonly prescriptions: PrescriptionsService) {}

  @Get()
  @AuditEntity("Medication")
  list() {
    return this.prescriptions.listMedications();
  }
}
