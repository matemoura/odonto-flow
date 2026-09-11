import { NotFoundException } from "@nestjs/common";
import { ReferralsService } from "./referrals.service";
import { PrismaService } from "../../database/prisma.service";

function fakePrisma(overrides: Record<string, unknown> = {}) {
  return {
    patient: { findFirst: jest.fn() },
    referral: { create: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
    ...overrides,
  } as unknown as PrismaService;
}

describe("ReferralsService.create", () => {
  it("recusa quando o paciente indicador não existe nesta clínica", async () => {
    const prisma = fakePrisma();
    (prisma.patient.findFirst as jest.Mock).mockResolvedValue(null);
    const service = new ReferralsService(prisma);

    await expect(
      service.create("clinic-1", { referrerPatientId: "p1", referredName: "Camila" }),
    ).rejects.toThrow(NotFoundException);
    expect(prisma.referral.create).not.toHaveBeenCalled();
  });
});

describe("ReferralsService.updateStatus", () => {
  it("recusa atualizar uma indicação inexistente", async () => {
    const prisma = fakePrisma();
    (prisma.referral.findFirst as jest.Mock).mockResolvedValue(null);
    const service = new ReferralsService(prisma);

    await expect(service.updateStatus("clinic-1", "ref-1", { status: "CONVERTED" })).rejects.toThrow(
      NotFoundException,
    );
  });
});
