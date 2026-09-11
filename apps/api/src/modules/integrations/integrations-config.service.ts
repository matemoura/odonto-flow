import { Injectable } from "@nestjs/common";
import { IntegrationKind } from "@odontoflow/db";
import { PrismaService } from "../../database/prisma.service";
import { UpdateIntegrationConfigDto } from "./dto/update-integration-config.dto";

const ALL_KINDS: IntegrationKind[] = ["WHATSAPP", "AI_ASSISTANT", "NFE", "E_SIGNATURE", "CREDIT_SCORE"];

@Injectable()
export class IntegrationsConfigService {
  constructor(private readonly prisma: PrismaService) {}

  /** Sempre retorna as 5 integrações — sintetiza "mock"/habilitado como padrão se ainda não configurada. */
  async list(clinicId: string) {
    const existing = await this.prisma.integrationConfig.findMany({ where: { clinicId } });
    const byKind = new Map(existing.map((c) => [c.kind, c]));

    return ALL_KINDS.map((kind) => {
      const config = byKind.get(kind);
      return {
        kind,
        providerName: config?.providerName ?? "mock",
        enabled: config?.enabled ?? true,
      };
    });
  }

  upsert(clinicId: string, kind: IntegrationKind, dto: UpdateIntegrationConfigDto) {
    return this.prisma.integrationConfig.upsert({
      where: { clinicId_kind: { clinicId, kind } },
      update: { providerName: dto.providerName, enabled: dto.enabled ?? true },
      create: { clinicId, kind, providerName: dto.providerName, enabled: dto.enabled ?? true },
    });
  }
}
