import { BadRequestException, NotFoundException } from "@nestjs/common";
import { ContractsService } from "./contracts.service";
import { PrismaService } from "../../database/prisma.service";
import { ESignatureGatewayService } from "../integrations/e-signature-gateway.service";

function fakePrisma(overrides: Record<string, unknown> = {}) {
  return {
    budget: { findFirst: jest.fn() },
    contract: { create: jest.fn(), findFirst: jest.fn() },
    ...overrides,
  } as unknown as PrismaService;
}

function fakeESignature(overrides: Record<string, unknown> = {}) {
  return {
    createEnvelope: jest.fn().mockResolvedValue({ status: "signed", externalEnvelopeId: "env-1", signedAt: new Date() }),
    ...overrides,
  } as unknown as ESignatureGatewayService;
}

describe("ContractsService.generateForBudget", () => {
  it("recusa quando o orçamento não existe", async () => {
    const prisma = fakePrisma();
    (prisma.budget.findFirst as jest.Mock).mockResolvedValue(null);
    const service = new ContractsService(prisma, fakeESignature());

    await expect(service.generateForBudget("clinic-1", "budget-1")).rejects.toThrow(NotFoundException);
  });

  it("recusa gerar contrato para orçamento ainda não aprovado", async () => {
    const prisma = fakePrisma();
    (prisma.budget.findFirst as jest.Mock).mockResolvedValue({
      id: "budget-1",
      status: "PENDING",
      patient: { name: "Fulano" },
      items: [],
    });
    const service = new ContractsService(prisma, fakeESignature());

    await expect(service.generateForBudget("clinic-1", "budget-1")).rejects.toThrow(BadRequestException);
    expect(prisma.contract.create).not.toHaveBeenCalled();
  });

  it("gera o conteúdo do termo com o total correto e marca como assinado quando o envelope volta assinado", async () => {
    const prisma = fakePrisma();
    (prisma.budget.findFirst as jest.Mock).mockResolvedValue({
      id: "budget-1",
      patientId: "patient-1",
      status: "APPROVED",
      patient: { name: "Fulano", email: null },
      items: [
        { quantity: 2, unitPriceCents: 10000, procedure: { name: "Restauração" } },
        { quantity: 1, unitPriceCents: 5000, procedure: { name: "Avaliação" } },
      ],
    });
    (prisma.contract.create as jest.Mock).mockImplementation(({ data }) => data);
    const eSignature = fakeESignature();
    const service = new ContractsService(prisma, eSignature);

    const contract = await service.generateForBudget("clinic-1", "budget-1");

    expect(contract.content).toMatch(/Total: R\$\s*250,00/); // total: 2x100 + 50
    expect(contract.content).toContain("Restauração x2");
    expect(contract.status).toBe("SIGNED");
    expect(eSignature.createEnvelope).toHaveBeenCalledWith(
      "clinic-1",
      expect.objectContaining({ signerEmail: "patient-1@sem-email.invalido" }),
    );
  });

  it("marca como pendente quando o envelope ainda não voltou assinado", async () => {
    const prisma = fakePrisma();
    (prisma.budget.findFirst as jest.Mock).mockResolvedValue({
      id: "budget-1",
      patientId: "patient-1",
      status: "APPROVED",
      patient: { name: "Fulano", email: "fulano@example.com" },
      items: [{ quantity: 1, unitPriceCents: 10000, procedure: { name: "Restauração" } }],
    });
    (prisma.contract.create as jest.Mock).mockImplementation(({ data }) => data);
    const eSignature = fakeESignature({
      createEnvelope: jest.fn().mockResolvedValue({ status: "pending", externalEnvelopeId: "env-2", signedAt: null }),
    });
    const service = new ContractsService(prisma, eSignature);

    const contract = await service.generateForBudget("clinic-1", "budget-1");

    expect(contract.status).toBe("PENDING");
  });
});
