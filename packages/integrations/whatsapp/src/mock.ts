import { randomUUID } from "node:crypto";
import { InboundMessage, OutboundTemplateMessage, WhatsAppProvider } from "./types";

/**
 * Implementação mock (padrão, grátis) — apenas loga a mensagem em memória em
 * vez de enviar de verdade. Usada em dev/demo até uma clínica plugar um
 * provedor real via IntegrationConfig (ver @odontoflow/shared-types).
 */
export class MockWhatsAppProvider implements WhatsAppProvider {
  readonly providerName = "mock";
  readonly sentMessages: OutboundTemplateMessage[] = [];
  private inboundHandler?: (message: InboundMessage) => Promise<void>;

  async sendTemplateMessage(message: OutboundTemplateMessage): Promise<{ externalId: string }> {
    this.sentMessages.push(message);
    return { externalId: randomUUID() };
  }

  onInboundMessage(handler: (message: InboundMessage) => Promise<void>): void {
    this.inboundHandler = handler;
  }

  /** Helper de teste/demo para simular uma mensagem recebida do paciente. */
  async simulateInbound(message: InboundMessage): Promise<void> {
    await this.inboundHandler?.(message);
  }
}
