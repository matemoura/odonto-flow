import { BadRequestException, NotFoundException } from "@nestjs/common";
import { CreditScoreService } from "./credit-score.service";
import { PrismaService } from "../../database/prisma.service";
import { CreditScoreGatewayService } from "../integrations/credit-score-gateway.service";

function fakePrisma(overrides: Record<string, unknown> = {}) {
  return {
    patient: { findFirst: jest.fn() },
    creditScoreQuery: { findFirst: jest.fn(), create: jest.fn() },
    ...overrides,
  } as unknown as PrismaService;
}

function fakeGateway(overrides: Record<string, unknown> = {}) {
  return {
    queryScore: jest.fn().mockResolvedValue({ score: 700, riskBand: "low" }),
    ...overrides,
  } as unknown as CreditScoreGatewayService;
}

describe("CreditScoreService.query", () => {
  it("recusa sem consentimento explícito, sem nem chegar a olhar o paciente", async () => {
    const prisma = fakePrisma();
    const service = new CreditScoreService(prisma, fakeGateway());

    await expect(service.query("clinic-1", "patient-1", false)).rejects.toThrow(BadRequestException);
    expect(prisma.patient.findFirst).not.toHaveBeenCalled();
  });

  it("recusa quando o paciente não existe nesta clínica", async () => {
    const prisma = fakePrisma();
    (prisma.patient.findFirst as jest.Mock).mockResolvedValue(null);
    const service = new CreditScoreService(prisma, fakeGateway());

    await expect(service.query("clinic-1", "patient-1", true)).rejects.toThrow(NotFoundException);
  });

  it("recusa quando o paciente não tem CPF cadastrado", async () => {
    const prisma = fakePrisma();
    (prisma.patient.findFirst as jest.Mock).mockResolvedValue({ id: "patient-1", cpf: null });
    const service = new CreditScoreService(prisma, fakeGateway());

    await expect(service.query("clinic-1", "patient-1", true)).rejects.toThrow(BadRequestException);
  });

  it("consulta o gateway e grava o resultado com um novo consentGivenAt (nunca reaproveita um antigo)", async () => {
    const prisma = fakePrisma();
    (prisma.patient.findFirst as jest.Mock).mockResolvedValue({ id: "patient-1", cpf: "12345678900" });
    (prisma.creditScoreQuery.create as jest.Mock).mockImplementation(({ data }) => data);
    const gateway = fakeGateway();
    const service = new CreditScoreService(prisma, gateway);

    const before = Date.now();
    const result = await service.query("clinic-1", "patient-1", true);
    const after = Date.now();

    expect(gateway.queryScore).toHaveBeenCalledWith("clinic-1", {
      patientId: "patient-1",
      patientCpf: "12345678900",
      consentGivenAt: expect.any(Date),
    });
    expect(result.score).toBe(700);
    expect(result.riskBand).toBe("low");
    expect(result.consentGivenAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(result.consentGivenAt.getTime()).toBeLessThanOrEqual(after);
  });
});
