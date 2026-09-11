import { BadRequestException, NotFoundException } from "@nestjs/common";
import { InvoicesService } from "./invoices.service";
import { PrismaService } from "../../database/prisma.service";
import { NfeGatewayService } from "../integrations/nfe-gateway.service";

function fakePrisma(overrides: Record<string, unknown> = {}) {
  return {
    transaction: { findFirst: jest.fn() },
    invoice: { findUnique: jest.fn(), create: jest.fn() },
    ...overrides,
  } as unknown as PrismaService;
}

function fakeNfe(overrides: Record<string, unknown> = {}) {
  return {
    issueServiceInvoice: jest.fn().mockResolvedValue({ externalId: "nfe-1", status: "issued", pdfUrl: null }),
    ...overrides,
  } as unknown as NfeGatewayService;
}

describe("InvoicesService.issueForTransaction", () => {
  it("recusa quando a transação não existe", async () => {
    const prisma = fakePrisma();
    (prisma.transaction.findFirst as jest.Mock).mockResolvedValue(null);
    const service = new InvoicesService(prisma, fakeNfe());

    await expect(service.issueForTransaction("clinic-1", "tx-1")).rejects.toThrow(NotFoundException);
  });

  it("recusa emitir nota para uma despesa", async () => {
    const prisma = fakePrisma();
    (prisma.transaction.findFirst as jest.Mock).mockResolvedValue({ id: "tx-1", type: "EXPENSE", paidAt: new Date() });
    const service = new InvoicesService(prisma, fakeNfe());

    await expect(service.issueForTransaction("clinic-1", "tx-1")).rejects.toThrow(BadRequestException);
  });

  it("recusa emitir nota para uma receita ainda não paga", async () => {
    const prisma = fakePrisma();
    (prisma.transaction.findFirst as jest.Mock).mockResolvedValue({ id: "tx-1", type: "INCOME", paidAt: null });
    const service = new InvoicesService(prisma, fakeNfe());

    await expect(service.issueForTransaction("clinic-1", "tx-1")).rejects.toThrow(BadRequestException);
  });

  it("é idempotente — retorna a nota já emitida em vez de emitir de novo", async () => {
    const prisma = fakePrisma();
    (prisma.transaction.findFirst as jest.Mock).mockResolvedValue({ id: "tx-1", type: "INCOME", paidAt: new Date() });
    const existingInvoice = { id: "invoice-1", status: "ISSUED" };
    (prisma.invoice.findUnique as jest.Mock).mockResolvedValue(existingInvoice);
    const nfe = fakeNfe();
    const service = new InvoicesService(prisma, nfe);

    const result = await service.issueForTransaction("clinic-1", "tx-1");

    expect(result).toBe(existingInvoice);
    expect(nfe.issueServiceInvoice).not.toHaveBeenCalled();
    expect(prisma.invoice.create).not.toHaveBeenCalled();
  });

  it("emite a nota via gateway e traduz o status do provedor para o enum do banco", async () => {
    const prisma = fakePrisma();
    (prisma.transaction.findFirst as jest.Mock).mockResolvedValue({
      id: "tx-1",
      type: "INCOME",
      paidAt: new Date(),
      amountCents: 25000,
      category: "Restauração",
    });
    (prisma.invoice.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.invoice.create as jest.Mock).mockImplementation(({ data }) => data);
    const nfe = fakeNfe({
      issueServiceInvoice: jest.fn().mockResolvedValue({ externalId: "nfe-1", status: "processing", pdfUrl: null }),
    });
    const service = new InvoicesService(prisma, nfe);

    const result = await service.issueForTransaction("clinic-1", "tx-1");

    expect(result.status).toBe("PROCESSING");
    expect(nfe.issueServiceInvoice).toHaveBeenCalledWith(
      "clinic-1",
      expect.objectContaining({ transactionId: "tx-1", amountCents: 25000 }),
    );
  });
});
