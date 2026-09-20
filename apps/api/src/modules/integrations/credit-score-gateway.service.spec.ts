import { ForbiddenException, NotImplementedException } from "@nestjs/common";
import { CreditScoreGatewayService } from "./credit-score-gateway.service";
import { fakeConfigService } from "./integration-gateways.test-double";

const REQUEST = { patientId: "patient-1", patientCpf: "12345678900", consentGivenAt: new Date() };

describe("CreditScoreGatewayService", () => {
  it("recusa quando a integração não foi liberada para a clínica", async () => {
    const service = new CreditScoreGatewayService(fakeConfigService(null));
    await expect(service.queryScore("clinic-1", REQUEST)).rejects.toThrow(ForbiddenException);
  });

  it("usa o provedor mock quando a liberação é em modo mock", async () => {
    const service = new CreditScoreGatewayService(fakeConfigService("mock"));
    const result = await service.queryScore("clinic-1", REQUEST);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(["low", "medium", "high"]).toContain(result.riskBand);
  });

  it("recusa um provedor real ainda não implementado", async () => {
    const service = new CreditScoreGatewayService(fakeConfigService("serasa"));
    await expect(service.queryScore("clinic-1", REQUEST)).rejects.toThrow(NotImplementedException);
  });
});
