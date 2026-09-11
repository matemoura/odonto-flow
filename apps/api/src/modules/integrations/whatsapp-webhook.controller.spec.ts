import { WhatsAppWebhookController } from "./whatsapp-webhook.controller";
import { PrismaService } from "../../database/prisma.service";
import { AiAssistantGatewayService } from "./ai-assistant-gateway.service";
import { WhatsAppGatewayService } from "./whatsapp-gateway.service";

function fakePrisma(overrides: Record<string, unknown> = {}) {
  return {
    clinic: { findUniqueOrThrow: jest.fn().mockResolvedValue({ id: "clinic-1", name: "Clínica Vila Nova" }) },
    patient: { findFirst: jest.fn().mockResolvedValue(null) },
    appointment: { findFirst: jest.fn().mockResolvedValue(null) },
    ...overrides,
  } as unknown as PrismaService;
}

function fakeAi(reply = "Olá! Como posso ajudar?") {
  return { chat: jest.fn().mockResolvedValue(reply) } as unknown as AiAssistantGatewayService;
}

function fakeWhatsapp() {
  return { sendTemplateMessage: jest.fn().mockResolvedValue({ externalId: "wa-1" }) } as unknown as WhatsAppGatewayService;
}

describe("WhatsAppWebhookController.handleInbound", () => {
  it("indica patientFound=false e não menciona nome quando o telefone não está cadastrado", async () => {
    const prisma = fakePrisma();
    const ai = fakeAi();
    const controller = new WhatsAppWebhookController(prisma, ai, fakeWhatsapp());

    const result = await controller.handleInbound("clinic-1", {
      fromPhoneE164: "+5511999999999",
      text: "Oi, quero remarcar",
    });

    expect(result.patientFound).toBe(false);
    const [systemMessage] = (ai.chat as jest.Mock).mock.calls[0][1];
    expect(systemMessage.content).toContain("não está cadastrado como paciente");
  });

  it("inclui o nome do paciente e a próxima consulta no contexto quando encontrado", async () => {
    const prisma = fakePrisma({
      patient: { findFirst: jest.fn().mockResolvedValue({ id: "patient-1", name: "Marina Bueno" }) },
      appointment: {
        findFirst: jest.fn().mockResolvedValue({
          startAt: new Date("2026-09-15T13:00:00.000Z"),
          professional: { user: { name: "Dra. Ana Prado" } },
        }),
      },
    });
    const ai = fakeAi();
    const controller = new WhatsAppWebhookController(prisma, ai, fakeWhatsapp());

    const result = await controller.handleInbound("clinic-1", {
      fromPhoneE164: "+5511900000000",
      text: "Que dia é minha consulta?",
    });

    expect(result.patientFound).toBe(true);
    const [systemMessage] = (ai.chat as jest.Mock).mock.calls[0][1];
    expect(systemMessage.content).toContain("Marina Bueno");
    expect(systemMessage.content).toContain("Dra. Ana Prado");
  });

  it("envia a resposta da IA de volta pelo WhatsApp gateway", async () => {
    const prisma = fakePrisma();
    const whatsapp = fakeWhatsapp();
    const controller = new WhatsAppWebhookController(prisma, fakeAi("Resposta gerada"), whatsapp);

    await controller.handleInbound("clinic-1", { fromPhoneE164: "+5511999999999", text: "Oi" });

    expect(whatsapp.sendTemplateMessage).toHaveBeenCalledWith("clinic-1", "+5511999999999", "ai_reply", {
      reply: "Resposta gerada",
    });
  });
});
