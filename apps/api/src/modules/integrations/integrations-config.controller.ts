import { Body, Controller, Get, Param, Put, UseGuards } from "@nestjs/common";
import { IntegrationKind, Role } from "@odontoflow/db";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { TenantGuard } from "../../common/guards/tenant.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentTenant } from "../../common/decorators/current-tenant.decorator";
import { IntegrationsConfigService } from "./integrations-config.service";
import { UpdateIntegrationConfigDto } from "./dto/update-integration-config.dto";

@Controller("integrations/config")
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Roles(Role.CLINIC_ADMIN, Role.ORG_ADMIN)
export class IntegrationsConfigController {
  constructor(private readonly config: IntegrationsConfigService) {}

  @Get()
  list(@CurrentTenant() clinicId: string) {
    return this.config.list(clinicId);
  }

  @Put(":kind")
  upsert(
    @CurrentTenant() clinicId: string,
    @Param("kind") kind: IntegrationKind,
    @Body() dto: UpdateIntegrationConfigDto,
  ) {
    return this.config.upsert(clinicId, kind, dto);
  }
}
