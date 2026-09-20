import { Body, Controller, Get, Put, UseGuards } from "@nestjs/common";
import { Role } from "@odontoflow/db";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { TenantGuard } from "../../common/guards/tenant.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentTenant } from "../../common/decorators/current-tenant.decorator";
import { IntegrationsConfigService } from "./integrations-config.service";
import { UpdateClinicIntegrationSettingsDto } from "./dto/update-clinic-integration-settings.dto";

/**
 * A visão da clínica. Não existe rota para trocar de provedor nem para
 * liberar/fechar integração: isso é do dono da plataforma
 * (`PlatformIntegrationsController`) e não fica só escondido na tela.
 */
@Controller("integrations/config")
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Roles(Role.CLINIC_ADMIN, Role.ORG_ADMIN)
export class IntegrationsConfigController {
  constructor(private readonly config: IntegrationsConfigService) {}

  @Get()
  get(@CurrentTenant() clinicId: string) {
    return this.config.getClinicView(clinicId);
  }

  @Put("settings")
  updateSettings(@CurrentTenant() clinicId: string, @Body() dto: UpdateClinicIntegrationSettingsDto) {
    return this.config.updateClinicSettings(clinicId, dto);
  }
}
