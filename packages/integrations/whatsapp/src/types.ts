/**
 * Contrato do adapter de WhatsApp. Implementações reais (fase 4): Meta Cloud
 * API ou um BSP homologado (360dialog/Zenvia/Twilio) — nunca API não-oficial
 * em produção (risco de banimento do número, ver plano seção "Riscos").
 */
export interface OutboundTemplateMessage {
  clinicId: string;
  /**
   * Número da clínica que envia. Um provedor real precisa dele para saber de
   * qual número do WABA sair — a mesma conta atende várias clínicas, e sem isso
   * o paciente receberia mensagem de um número que não reconhece.
   */
  fromPhoneE164: string;
  toPhoneE164: string;
  templateName: string;
  variables: Record<string, string>;
}

export interface InboundMessage {
  clinicId: string;
  fromPhoneE164: string;
  text?: string;
  audioUrl?: string;
  receivedAt: Date;
}

export interface WhatsAppProvider {
  readonly providerName: string;
  sendTemplateMessage(message: OutboundTemplateMessage): Promise<{ externalId: string }>;
  onInboundMessage(handler: (message: InboundMessage) => Promise<void>): void;
}
