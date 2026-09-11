import { NotFoundException } from "@nestjs/common";
import { ClinicalRecordsService } from "./clinical-records.service";
import { PrismaService } from "../../database/prisma.service";

function fakePrisma(overrides: Record<string, unknown> = {}) {
  return {
    professional: { findFirst: jest.fn().mockResolvedValue({ id: "prof-1" }) },
    clinicalRecord: { create: jest.fn(), findMany: jest.fn() },
    odontogram: { create: jest.fn(), findMany: jest.fn() },
    periodontalEntry: { create: jest.fn(), findMany: jest.fn() },
    anamnesis: { findFirst: jest.fn(), findUnique: jest.fn(), upsert: jest.fn() },
    treatmentPlanOption: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    ...overrides,
  } as unknown as PrismaService;
}

describe("ClinicalRecordsService.create", () => {
  it("recusa registrar prontuário para quem não é profissional desta clínica", async () => {
    const prisma = fakePrisma();
    (prisma.professional.findFirst as jest.Mock).mockResolvedValue(null);
    const service = new ClinicalRecordsService(prisma);

    await expect(
      service.create("clinic-1", "user-1", { patientId: "p1", type: "EVOLUTION", content: "..." }),
    ).rejects.toThrow(NotFoundException);
    expect(prisma.clinicalRecord.create).not.toHaveBeenCalled();
  });

  it("grava o prontuário com o professionalId resolvido a partir do userId autenticado", async () => {
    const prisma = fakePrisma();
    (prisma.professional.findFirst as jest.Mock).mockResolvedValue({ id: "prof-1" });
    const service = new ClinicalRecordsService(prisma);

    await service.create("clinic-1", "user-1", { patientId: "p1", type: "EVOLUTION", content: "Sem queixas." });

    expect(prisma.clinicalRecord.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ professionalId: "prof-1", patientId: "p1", content: "Sem queixas." }),
    });
  });
});

describe("ClinicalRecordsService.getOdontogram", () => {
  it("retorna só a entrada mais recente por dente, ordenada por número do dente", async () => {
    const prisma = fakePrisma();
    (prisma.odontogram.findMany as jest.Mock).mockResolvedValue([
      // já vem ordenado por updatedAt desc (mockado direto na ordem que o service espera receber do banco)
      { toothNumber: 26, condition: "RESTORED", updatedAt: new Date("2026-02-01") },
      { toothNumber: 11, condition: "CARIES", updatedAt: new Date("2026-01-15") },
      { toothNumber: 11, condition: "HEALTHY", updatedAt: new Date("2026-01-01") }, // mais antiga, deve ser ignorada
    ]);
    const service = new ClinicalRecordsService(prisma);

    const result = await service.getOdontogram("clinic-1", "p1");

    expect(result).toEqual([
      { toothNumber: 11, condition: "CARIES", updatedAt: new Date("2026-01-15") },
      { toothNumber: 26, condition: "RESTORED", updatedAt: new Date("2026-02-01") },
    ]);
  });
});

describe("ClinicalRecordsService.getPeriodontogram", () => {
  it("retorna só a entrada mais recente por dente, ordenada por número do dente", async () => {
    const prisma = fakePrisma();
    (prisma.periodontalEntry.findMany as jest.Mock).mockResolvedValue([
      { toothNumber: 26, mobility: 1, updatedAt: new Date("2026-02-01") },
      { toothNumber: 11, mobility: 0, updatedAt: new Date("2026-01-15") },
      { toothNumber: 11, mobility: 2, updatedAt: new Date("2026-01-01") },
    ]);
    const service = new ClinicalRecordsService(prisma);

    const result = await service.getPeriodontogram("clinic-1", "p1");

    expect(result).toEqual([
      { toothNumber: 11, mobility: 0, updatedAt: new Date("2026-01-15") },
      { toothNumber: 26, mobility: 1, updatedAt: new Date("2026-02-01") },
    ]);
  });
});

describe("ClinicalRecordsService.upsertPeriodontalEntry", () => {
  it("recusa quando quem registra não é profissional desta clínica", async () => {
    const prisma = fakePrisma({ professional: { findFirst: jest.fn().mockResolvedValue(null) } });
    const service = new ClinicalRecordsService(prisma);

    await expect(
      service.upsertPeriodontalEntry("clinic-1", "user-1", { patientId: "p1", toothNumber: 11, bleeding: true }),
    ).rejects.toThrow(NotFoundException);
    expect(prisma.periodontalEntry.create).not.toHaveBeenCalled();
  });

  it("cria uma nova linha (append-only) com o updatedBy do usuário autenticado", async () => {
    const prisma = fakePrisma();
    const service = new ClinicalRecordsService(prisma);

    await service.upsertPeriodontalEntry("clinic-1", "user-1", {
      patientId: "p1",
      toothNumber: 26,
      probingDepthBuccalMesial: 3,
      bleeding: true,
    });

    expect(prisma.periodontalEntry.create).toHaveBeenCalledWith({
      data: {
        clinicId: "clinic-1",
        patientId: "p1",
        toothNumber: 26,
        probingDepthBuccalMesial: 3,
        bleeding: true,
        updatedBy: "user-1",
      },
    });
  });
});

describe("ClinicalRecordsService.upsertAnamnesis", () => {
  it("recusa quando quem registra não é profissional desta clínica", async () => {
    const prisma = fakePrisma({ professional: { findFirst: jest.fn().mockResolvedValue(null) } });
    const service = new ClinicalRecordsService(prisma);

    await expect(service.upsertAnamnesis("clinic-1", "user-1", { patientId: "p1" })).rejects.toThrow(
      NotFoundException,
    );
    expect(prisma.anamnesis.upsert).not.toHaveBeenCalled();
  });

  it("marca o consentimento com a data de agora na primeira vez que é dado", async () => {
    const prisma = fakePrisma();
    (prisma.anamnesis.findUnique as jest.Mock).mockResolvedValue(null);
    const service = new ClinicalRecordsService(prisma);

    await service.upsertAnamnesis("clinic-1", "user-1", { patientId: "p1", treatmentConsent: true });

    const call = (prisma.anamnesis.upsert as jest.Mock).mock.calls[0][0];
    expect(call.create.treatmentConsentAt).toEqual(expect.any(Date));
    expect(call.update.treatmentConsentAt).toEqual(expect.any(Date));
  });

  it("preserva a data original do consentimento já dado (não refaz o timestamp a cada salvamento)", async () => {
    const prisma = fakePrisma();
    const consentimentoOriginal = new Date("2026-01-01T10:00:00Z");
    (prisma.anamnesis.findUnique as jest.Mock).mockResolvedValue({ treatmentConsentAt: consentimentoOriginal });
    const service = new ClinicalRecordsService(prisma);

    await service.upsertAnamnesis("clinic-1", "user-1", {
      patientId: "p1",
      treatmentConsent: true,
      chiefComplaint: "Dor no dente 26",
    });

    const call = (prisma.anamnesis.upsert as jest.Mock).mock.calls[0][0];
    expect(call.update.treatmentConsentAt).toBe(consentimentoOriginal);
  });

  it("revoga o consentimento (limpa o timestamp) quando enviado como false", async () => {
    const prisma = fakePrisma();
    (prisma.anamnesis.findUnique as jest.Mock).mockResolvedValue({ treatmentConsentAt: new Date() });
    const service = new ClinicalRecordsService(prisma);

    await service.upsertAnamnesis("clinic-1", "user-1", { patientId: "p1", treatmentConsent: false });

    const call = (prisma.anamnesis.upsert as jest.Mock).mock.calls[0][0];
    expect(call.update.treatmentConsentAt).toBeNull();
  });

  it("não mexe no consentimento quando o campo não é enviado", async () => {
    const prisma = fakePrisma();
    (prisma.anamnesis.findUnique as jest.Mock).mockResolvedValue({ treatmentConsentAt: new Date() });
    const service = new ClinicalRecordsService(prisma);

    await service.upsertAnamnesis("clinic-1", "user-1", { patientId: "p1", chiefComplaint: "Retorno" });

    const call = (prisma.anamnesis.upsert as jest.Mock).mock.calls[0][0];
    expect(call.update.treatmentConsentAt).toBeUndefined();
  });
});

describe("ClinicalRecordsService.updateTreatmentPlanOption/removeTreatmentPlanOption", () => {
  it("recusa atualizar uma opção que não existe nesta clínica", async () => {
    const prisma = fakePrisma();
    (prisma.treatmentPlanOption.findFirst as jest.Mock).mockResolvedValue(null);
    const service = new ClinicalRecordsService(prisma);

    await expect(service.updateTreatmentPlanOption("clinic-1", "opt-1", { label: "Nova" })).rejects.toThrow(
      NotFoundException,
    );
  });

  it("recusa remover uma opção que não existe nesta clínica", async () => {
    const prisma = fakePrisma();
    (prisma.treatmentPlanOption.findFirst as jest.Mock).mockResolvedValue(null);
    const service = new ClinicalRecordsService(prisma);

    await expect(service.removeTreatmentPlanOption("clinic-1", "opt-1")).rejects.toThrow(NotFoundException);
    expect(prisma.treatmentPlanOption.delete).not.toHaveBeenCalled();
  });
});
