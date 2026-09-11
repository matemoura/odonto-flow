import { AiAssistantProvider, ChatMessage } from "./types";

/**
 * Mock rule-based: sem custo, sem chamada externa. Extrai fatos simples do
 * system prompt (nome do paciente, próxima consulta) e reage a palavras-chave
 * óbvias — não é um LLM de verdade, só o suficiente pra demonstrar o fluxo
 * "Secretária IA" ponta a ponta sem pagar por nada.
 */
export class MockAiAssistantProvider implements AiAssistantProvider {
  readonly providerName = "mock";

  async chat(messages: ChatMessage[]): Promise<string> {
    const system = messages.find((m) => m.role === "system")?.content ?? "";
    const lastUserMessage = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
    const texto = lastUserMessage.toLowerCase();

    const temConsulta = /próxima consulta agendada: (\S+)/i.exec(system);
    const nomePaciente = /paciente que está escrevendo é ([^.]+)\./i.exec(system)?.[1];

    if (/cancel/.test(texto)) {
      return "Entendido — vou avisar a recepção para cancelar. Alguém confirma com você em instantes.";
    }

    if (/hor[aá]rio|consulta|agend/.test(texto)) {
      if (temConsulta) {
        return `Oi${nomePaciente ? `, ${nomePaciente}` : ""}! Sua próxima consulta está confirmada. Se precisar remarcar, me avisa com pelo menos 4h de antecedência.`;
      }
      return "Ainda não encontrei uma consulta futura no seu nome. Quer que eu te mande o link de agendamento?";
    }

    return `Recebi sua mensagem: "${lastUserMessage}". Em breve alguém da clínica te responde — se for sobre horário de consulta, já consigo ajudar também.`;
  }

  async transcribeAudio(_audioUrl: string): Promise<string> {
    return "[mock] transcrição de áudio não disponível — plugue um provedor real (fase 4).";
  }
}
