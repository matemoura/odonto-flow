/**
 * Contrato do adapter de IA ("Secretária IA" / "Copiloto"). Implementações
 * reais (fase 4): Anthropic Claude, OpenAI ou Gemini — avaliar
 * anonimização/DPA antes de enviar dado de paciente a um provedor real.
 */
export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AiAssistantProvider {
  readonly providerName: string;
  chat(messages: ChatMessage[]): Promise<string>;
  transcribeAudio?(audioUrl: string): Promise<string>;
}
