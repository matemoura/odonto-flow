import { ForbiddenException, NotImplementedException } from "@nestjs/common";
import { WhatsAppGatewayService } from "./whatsapp-gateway.service";
import { fakeConfigService } from "./integration-gateways.test-double";

describe("WhatsAppGatewayService", () => {
  it("recusa quando a integração não foi liberada para a clínica", async () => {
    const service = new WhatsAppGatewayService(fakeConfigService(null));
    await expect(
      service.sendTemplateMessage("clinic-1", "+5511900000000", "appointment_confirmation", {}),
    ).rejects.toThrow(ForbiddenException);
  });

  it("envia pelo mock quando a liberação é em modo mock", async () => {
    const service = new WhatsAppGatewayService(fakeConfigService("mock"));
    const result = await service.sendTemplateMessage("clinic-1", "+5511900000000", "appointment_confirmation", {});
    expect(result.externalId).toBeDefined();
  });

  // O remetente é da clínica, não da plataforma: liberar a integração não basta
  // se ninguém disse de qual número as mensagens saem.
  it("recusa o envio se a clínica não informou o número dela", async () => {
    const service = new WhatsAppGatewayService(fakeConfigService("mock", null));
    await expect(
      service.sendTemplateMessage("clinic-1", "+5511900000000", "appointment_confirmation", {}),
    ).rejects.toThrow(ForbiddenException);
  });

  it("manda o número da clínica como remetente, e não só o do paciente", async () => {
    const service = new WhatsAppGatewayService(fakeConfigService("mock", "+5511555550000"));
    const provider = await service.resolveProvider("clinic-1");
    const enviar = jest.spyOn(provider, "sendTemplateMessage");

    await service.sendTemplateMessage("clinic-1", "+5511900000000", "appointment_confirmation", {});

    expect(enviar).toHaveBeenCalledWith(
      expect.objectContaining({ fromPhoneE164: "+5511555550000", toPhoneE164: "+5511900000000" }),
    );
  });

  it("recusa um provedor real ainda não implementado", async () => {
    const service = new WhatsAppGatewayService(fakeConfigService("meta-cloud-api"));
    await expect(
      service.sendTemplateMessage("clinic-1", "+5511900000000", "appointment_confirmation", {}),
    ).rejects.toThrow(NotImplementedException);
  });

  it("sendAppointmentConfirmation repassa as variáveis certas pro template de confirmação", async () => {
    const service = new WhatsAppGatewayService(fakeConfigService("mock"));
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
