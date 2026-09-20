/**
 * Tipos compartilhados para o padrão de adapter plugável de integrações pagas
 * (ver plano, seção "Padrão de adapter para integrações pagas").
 *
 * Quem escolhe o provedor é o **dono da plataforma**, não a clínica: é ele quem
 * contrata e paga o serviço real. A clínica só preenche o que é dela (o número
 * de WhatsApp, por exemplo, que vive em `Clinic.whatsappPhone`).
 */
export type IntegrationKind = "whatsapp" | "ai-assistant" | "nfe" | "e-signature" | "credit-score";

export interface IntegrationConfigDto {
  clinicId: string;
  kind: IntegrationKind;
  providerName: "mock" | (string & {});
  enabled: boolean;
}
