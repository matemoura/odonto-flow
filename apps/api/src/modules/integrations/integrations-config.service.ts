import { ForbiddenException, Injectable } from "@nestjs/common";
import { IntegrationKind } from "@odontoflow/db";
import { PrismaService } from "../../database/prisma.service";
import { ReleaseIntegrationDto } from "./dto/release-integration.dto";
import { UpdateClinicIntegrationSettingsDto } from "./dto/update-clinic-integration-settings.dto";

export const ALL_KINDS: IntegrationKind[] = ["WHATSAPP", "AI_ASSISTANT", "NFE", "E_SIGNATURE", "CREDIT_SCORE"];

/**
 * Integrações têm dois donos, e é isso que este serviço separa.
 *
 * O **dono da plataforma** decide quais clínicas têm quais integrações e com
 * qual provedor — é ele quem contrata e paga o serviço real. O **dono da
 * clínica** só mexe no que é dele: hoje, o número de WhatsApp de onde as
 * mensagens saem.
 *
 * Integração sem linha na tabela é integração NÃO liberada. Antes a ausência
 * valia como "liberada em modo mock", o que deixava toda clínica nova com as
 * cinco ligadas sem ninguém ter decidido nada.
 */
@Injectable()
export class IntegrationsConfigService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Porta de entrada dos gateways: ou devolve o provedor liberado, ou recusa.
   * Os cinco gateways passam por aqui para que "liberada" signifique a mesma
   * coisa em todos — e para que desligar na tela do dono da plataforma
   * realmente pare a chamada, em vez de só sumir com a linha da tela.
   */
  async requireReleased(clinicId: string, kind: IntegrationKind): Promise<{ providerName: string }> {
    const config = await this.prisma.integrationConfig.findUnique({
      where: { clinicId_kind: { clinicId, kind } },
    });
    if (!config?.enabled) {
      throw new ForbiddenException(
        `A integração ${kind} não está liberada para esta clínica. Fale com o administrador da plataforma.`,
      );
    }
    return { providerName: config.providerName };
  }

  /**
   * O número da clínica de onde as mensagens saem. Recusar aqui é melhor do que
   * enviar de um número qualquer: o paciente que recebe uma confirmação de um
   * número desconhecido não confia nela.
   */
  async requireWhatsAppSender(clinicId: string): Promise<string> {
    const clinic = await this.prisma.clinic.findUniqueOrThrow({
      where: { id: clinicId },
      select: { whatsappPhone: true },
    });
    if (!clinic.whatsappPhone) {
      throw new ForbiddenException(
        "A clínica ainda não informou o número de WhatsApp dela. Preencha em Configurações › Integrações.",
      );
    }
    return clinic.whatsappPhone;
  }

  /**
   * O que a clínica vê e edita. Não devolve as integrações fechadas: o dono da
   * clínica não precisa saber que existe uma lista maior que a dele.
   */
  async getClinicView(clinicId: string) {
    const [clinic, configs] = await Promise.all([
      this.prisma.clinic.findUniqueOrThrow({
        where: { id: clinicId },
        select: { whatsappPhone: true },
      }),
      this.prisma.integrationConfig.findMany({
        where: { clinicId, enabled: true },
        select: { kind: true, providerName: true },
      }),
    ]);

    return {
      whatsappPhone: clinic.whatsappPhone,
      // Ordem fixa da lista, não a ordem que o banco devolveu — a tela não deve
      // trocar de arrumação a cada liberação nova.
      integrations: ALL_KINDS.filter((kind) => configs.some((c) => c.kind === kind)).map((kind) => ({
        kind,
        providerName: configs.find((c) => c.kind === kind)!.providerName,
      })),
    };
  }

  /** Campos da clínica, e só eles — provedor e liberação não passam por aqui. */
  async updateClinicSettings(clinicId: string, dto: UpdateClinicIntegrationSettingsDto) {
    await this.prisma.clinic.update({
      where: { id: clinicId },
      data: { whatsappPhone: dto.whatsappPhone?.trim() || null },
    });
    return this.getClinicView(clinicId);
  }

  /**
   * Painel do dono da plataforma: todas as clínicas, cada uma com as cinco
   * integrações — inclusive as fechadas, que são justamente as que ele pode
   * querer abrir.
   */
  async listForPlatform() {
    const [clinics, configs] = await Promise.all([
      this.prisma.clinic.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true, slug: true },
      }),
      this.prisma.integrationConfig.findMany({
        select: { clinicId: true, kind: true, providerName: true, enabled: true },
      }),
    ]);

    return clinics.map((clinic) => ({
      ...clinic,
      integrations: ALL_KINDS.map((kind) => {
        const config = configs.find((c) => c.clinicId === clinic.id && c.kind === kind);
        return {
          kind,
          providerName: config?.providerName ?? "mock",
          enabled: config?.enabled ?? false,
        };
      }),
    }));
  }

  async setRelease(clinicId: string, kind: IntegrationKind, dto: ReleaseIntegrationDto) {
    const providerName = dto.providerName ?? "mock";
    return this.prisma.integrationConfig.upsert({
      where: { clinicId_kind: { clinicId, kind } },
      update: { providerName, enabled: dto.enabled },
      create: { clinicId, kind, providerName, enabled: dto.enabled },
      select: { clinicId: true, kind: true, providerName: true, enabled: true },
    });
  }
}
