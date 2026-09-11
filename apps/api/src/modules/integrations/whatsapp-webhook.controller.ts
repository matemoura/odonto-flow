import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { TenantGuard } from "../../common/guards/tenant.guard";
import { CurrentTenant } from "../../common/decorators/current-tenant.decorator";
import { PrismaService } from "../../database/prisma.service";
import { AiAssistantGatewayService } from "./ai-assistant-gateway.service";
import { WhatsAppGatewayService } from "./whatsapp-gateway.service";
import { WhatsAppWebhookDto } from "./dto/whatsapp-webhook.dto";

/**
 * Simula o webhook que a Meta Cloud API chamaria quando um paciente manda
 * mensagem no WhatsApp da clínica — é a "Secretária IA" do plano (Fase 4).
 * Sem número de WhatsApp real conectado ainda, então: (1) esse endpoint faz
 * as vezes de "mensagem recebida", (2) a resposta da IA é devolvida também
 * no corpo da resposta HTTP, além de "enviada" (logada) pelo WhatsAppGateway.
 */
@Controller("integrations/whatsapp")
@UseGuards(TenantGuard)
export class WhatsAppWebhookController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiAssistantGatewayService,
    private readonly whatsapp: WhatsAppGatewayService,
  ) {}

  // Público e sem CAPTCHA — cada chamada real dispara IA + WhatsApp (pago
  // quando um provedor real for plugado), então limita chamadas por IP.
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post("webhook")
  async handleInbound(@CurrentTenant() clinicId: string, @Body() dto: WhatsAppWebhookDto) {
    const clinic = await this.prisma.clinic.findUniqueOrThrow({ where: { id: clinicId } });
    const patient = await this.prisma.patient.findFirst({
      where: { clinicId, phone: dto.fromPhoneE164 },
    });

    const nextAppointment = patient
      ? await this.prisma.appointment.findFirst({
          where: { clinicId, patientId: patient.id, startAt: { gte: new Date() }, status: { not: "CANCELLED" } },
          orderBy: { startAt: "asc" },
          include: { professional: { select: { user: { select: { name: true } } } } },
        })
      : null;

    const context = [
      `Você é a secretária virtual da ${clinic.name}, uma clínica odontológica.`,
      "Responda de forma breve, educada e objetiva. Não invente informações que não foram te dadas.",
      patient
        ? `O paciente que está escrevendo é ${patient.name}.`
        : "Esse número de telefone não está cadastrado como paciente ainda.",
      nextAppointment
        ? `Próxima consulta agendada: ${nextAppointment.startAt.toISOString()} com ${nextAppointment.professional.user.name}.`
        : "Não há consulta futura agendada para essa pessoa.",
    ].join(" ");

    const reply = await this.ai.chat(clinicId, [
      { role: "system", content: context },
      { role: "user", content: dto.text },
    ]);

    await this.whatsapp.sendTemplateMessage(clinicId, dto.fromPhoneE164, "ai_reply", { reply });

    return { reply, patientFound: Boolean(patient) };
  }
}
