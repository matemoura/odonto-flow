import { MockAiAssistantProvider } from "@odontoflow/integration-ai-assistant";

describe("MockAiAssistantProvider (Secretária IA)", () => {
  const provider = new MockAiAssistantProvider();

  it("responde sobre consulta futura quando o system prompt já traz o fato", async () => {
    const reply = await provider.chat([
      {
        role: "system",
        content:
          "O paciente que está escrevendo é Marina Bueno. Próxima consulta agendada: 2026-09-11T12:20:00.000Z com Dra. Ana Prado.",
      },
      { role: "user", content: "oi, qual o horário da minha consulta?" },
    ]);

    expect(reply).toContain("Marina Bueno");
    expect(reply.toLowerCase()).toContain("confirmada");
  });

  it("oferece o link de agendamento quando pergunta de horário mas não há consulta futura", async () => {
    const reply = await provider.chat([
      { role: "system", content: "Não há consulta futura agendada para essa pessoa." },
      { role: "user", content: "quero marcar um horário" },
    ]);

    expect(reply.toLowerCase()).toContain("agendamento");
  });

  it("reconhece pedido de cancelamento", async () => {
    const reply = await provider.chat([
      { role: "system", content: "" },
      { role: "user", content: "preciso cancelar minha consulta" },
    ]);

    expect(reply.toLowerCase()).toContain("cancel");
  });

  it("cai no fallback genérico para mensagens sem palavra-chave reconhecida", async () => {
    const reply = await provider.chat([{ role: "user", content: "bom dia" }]);
    expect(reply).toContain("bom dia");
  });
});
