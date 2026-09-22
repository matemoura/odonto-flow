import { Body, Controller, Get, Param, Put, UseGuards } from "@nestjs/common";
import { IntegrationKind } from "@odontoflow/db";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { SuperAdminGuard } from "../../common/guards/super-admin.guard";
import { IntegrationsConfigService } from "./integrations-config.service";
import { ReleaseIntegrationDto } from "./dto/release-integration.dto";
import { UpsertPlatformIntegrationCredentialDto } from "./dto/upsert-platform-integration-credential.dto";

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

  /**
   * A conexão real com cada provedor — o que a plataforma contratou, não o
   * que cada clínica tem liberado (isso é `release()`, abaixo). Precisam vir
   * ANTES de `:clinicId/:kind`: como as duas rotas têm dois segmentos, uma
   * rota coringa registrada primeiro casaria com "credentials/:kind" antes de
   * chegar aqui (`clinicId` viraria a string literal "credentials").
   */
  @Get("credentials")
  listCredentials() {
    return this.config.listCredentials();
  }

  @Put("credentials/:kind")
  upsertCredential(@Param("kind") kind: IntegrationKind, @Body() dto: UpsertPlatformIntegrationCredentialDto) {
    return this.config.upsertCredential(kind, dto);
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
