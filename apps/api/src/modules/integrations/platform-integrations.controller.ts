import { Body, Controller, Get, Param, Put, UseGuards } from "@nestjs/common";
import { IntegrationKind } from "@odontoflow/db";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { SuperAdminGuard } from "../../common/guards/super-admin.guard";
import { IntegrationsConfigService } from "./integrations-config.service";
import { ReleaseIntegrationDto } from "./dto/release-integration.dto";

/**
 * Painel do dono da plataforma: quais clínicas têm quais integrações.
 * Cross-tenant de propósito — sem TenantGuard, como o resto de /platform-admin.
 */
@Controller("platform-admin/integrations")
@UseGuards(JwtAuthGuard, SuperAdminGuard)
export class PlatformIntegrationsController {
  constructor(private readonly config: IntegrationsConfigService) {}

  @Get()
  list() {
    return this.config.listForPlatform();
  }

  @Put(":clinicId/:kind")
  release(
    @Param("clinicId") clinicId: string,
    @Param("kind") kind: IntegrationKind,
    @Body() dto: ReleaseIntegrationDto,
  ) {
    return this.config.setRelease(clinicId, kind, dto);
  }
}
