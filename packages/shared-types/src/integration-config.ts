/**
 * Tipos compartilhados para o padrão de adapter plugável de integrações pagas
 * (ver plano, seção "Padrão de adapter para integrações pagas"). Cada clínica
 * escolhe, por tipo de integração, o provedor "mock" (padrão, grátis) ou um
 * provedor real — sem alterar código de módulo de negócio.
 */
export type IntegrationKind = "whatsapp" | "ai-assistant" | "nfe" | "e-signature" | "credit-score";

export interface IntegrationConfigDto {
  clinicId: string;
  kind: IntegrationKind;
  providerName: "mock" | (string & {});
  enabled: boolean;
}
