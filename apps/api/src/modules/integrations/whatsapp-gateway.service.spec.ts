import { NotImplementedException } from "@nestjs/common";
import { WhatsAppGatewayService } from "./whatsapp-gateway.service";
import { PrismaService } from "../../database/prisma.service";

function fakePrisma(config: { providerName: string } | null) {
  return {
    integrationConfig: { findUnique: jest.fn().mockResolvedValue(config) },
  } as unknown as PrismaService;
}

describe("WhatsAppGatewayService", () => {
  it("usa o provedor mock quando não há configuração salva", async () => {
    const service = new WhatsAppGatewayService(fakePrisma(null));
    const result = await service.sendTemplateMessage("clinic-1", "+5511900000000", "appointment_confirmation", {});
    expect(result.externalId).toBeDefined();
  });

  it("recusa um provedor real ainda não implementado", async () => {
    const service = new WhatsAppGatewayService(fakePrisma({ providerName: "meta-cloud-api" }));
    await expect(
      service.sendTemplateMessage("clinic-1", "+5511900000000", "appointment_confirmation", {}),
    ).rejects.toThrow(NotImplementedException);
  });

  it("sendAppointmentConfirmation repassa as variáveis certas pro template de confirmação", async () => {
    const service = new WhatsAppGatewayService(fakePrisma(null));
    const spy = jest.spyOn(service, "sendTemplateMessage");

    await service.sendAppointmentConfirmation("clinic-1", "+5511900000000", {
      patientName: "Fulano",
      whenLabel: "10/09/2026 às 10:00",
      professionalName: "Dra. Ana",
    });

    expect(spy).toHaveBeenCalledWith("clinic-1", "+5511900000000", "appointment_confirmation", {
      patientName: "Fulano",
      whenLabel: "10/09/2026 às 10:00",
      professionalName: "Dra. Ana",
    });
  });
});
