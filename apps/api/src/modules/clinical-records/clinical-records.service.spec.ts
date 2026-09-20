import { NotFoundException } from "@nestjs/common";
import { ClinicalRecordsService } from "./clinical-records.service";
import { PrismaService } from "../../database/prisma.service";

function fakePrisma(overrides: Record<string, unknown> = {}) {
  return {
    professional: { findFirst: jest.fn().mockResolvedValue({ id: "prof-1" }) },
    // Por padrão o paciente É desta clínica; os testes de isolamento abaixo
    // sobrescrevem com `null` para simular id de paciente de outra clínica.
    patient: { findFirst: jest.fn().mockResolvedValue({ id: "patient-1" }) },
    appointment: { findFirst: jest.fn().mockResolvedValue({ id: "appt-1" }) },
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

  it("recusa um appointmentId que não é deste paciente nesta clínica", async () => {
    const prisma = fakePrisma({ appointment: { findFirst: jest.fn().mockResolvedValue(null) } });
    const service = new ClinicalRecordsService(prisma);

    await expect(
      service.create("clinic-1", "user-1", {
        patientId: "p1",
        appointmentId: "appt-de-outro-paciente",
        type: "EVOLUTION",
        content: "...",
      }),
    ).rejects.toThrow(NotFoundException);
    expect(prisma.clinicalRecord.create).not.toHaveBeenCalled();
  });

  it("grava o horário de cada assinatura no momento do registro, nunca um valor vindo do cliente", async () => {
    const prisma = fakePrisma();
    const service = new ClinicalRecordsService(prisma);

    await service.create("clinic-1", "user-1", {
      patientId: "p1",
      appointmentId: "appt-1",
      type: "EVOLUTION",
      content: "Restauração no 26.",
      professionalSignature: "data:image/png;base64,AAA",
      patientSignature: "data:image/png;base64,BBB",
    });

    const call = (prisma.clinicalRecord.create as jest.Mock).mock.calls[0][0];
    expect(call.data.professionalSignature).toBe("data:image/png;base64,AAA");
    expect(call.data.professionalSignedAt).toEqual(expect.any(Date));
    expect(call.data.patientSignature).toBe("data:image/png;base64,BBB");
    expect(call.data.patientSignedAt).toEqual(expect.any(Date));
  });

  it("não grava horário de assinatura quando nenhuma assinatura é enviada", async () => {
    const prisma = fakePrisma();
    const service = new ClinicalRecordsService(prisma);

    await service.create("clinic-1", "user-1", { patientId: "p1", type: "EVOLUTION", content: "Sem assinatura." });

    const call = (prisma.clinicalRecord.create as jest.Mock).mock.calls[0][0];
    expect(call.data.professionalSignedAt).toBeUndefined();
    expect(call.data.patientSignedAt).toBeUndefined();
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

/**
 * Isolamento entre clínicas nas rotas que recebem `patientId` no corpo.
 *
 * O TenantGuard prova que o usuário pertence à clínica do slug — ele nunca
 * olhou os ids que vêm no corpo. O caso mais grave era a anamnese: como
 * `Anamnesis.patientId` é único GLOBAL, `upsert({ where: { patientId } })`
 * alcançava a linha de qualquer clínica, devolvendo e regravando o prontuário
 * médico completo (alergias, medicação, gestação) de paciente alheio.
 */
describe("ClinicalRecordsService — paciente de outra clínica", () => {
  const DE_OUTRA_CLINICA = { patient: { findFirst: jest.fn().mockResolvedValue(null) } };

  it("não devolve nem regrava a anamnese de paciente de outra clínica", async () => {
    const prisma = fakePrisma(DE_OUTRA_CLINICA);
    const service = new ClinicalRecordsService(prisma);

    await expect(
      service.upsertAnamnesis("clinic-1", "user-1", { patientId: "paciente-da-clinica-b" }),
    ).rejects.toThrow(NotFoundException);

    // O ponto do teste: o Prisma nem chega a ser chamado. Verificar só a
    // exceção deixaria passar uma versão que lê primeiro e recusa depois —
    // a leitura já teria acontecido.
    expect(prisma.anamnesis.findUnique).not.toHaveBeenCalled();
    expect(prisma.anamnesis.upsert).not.toHaveBeenCalled();
  });

  it("recusa evolução clínica, odontograma, periograma e plano de tratamento", async () => {
    const prisma = fakePrisma(DE_OUTRA_CLINICA);
    const service = new ClinicalRecordsService(prisma);
    const alheio = "paciente-da-clinica-b";

    await expect(
      service.create("clinic-1", "user-1", { patientId: alheio, type: "EVOLUTION", content: "x" }),
    ).rejects.toThrow(NotFoundException);
    await expect(
      service.upsertOdontogramEntry("clinic-1", "user-1", {
        patientId: alheio,
        toothNumber: 11,
        condition: "CARIES",
      }),
    ).rejects.toThrow(NotFoundException);
    await expect(
      service.upsertPeriodontalEntry("clinic-1", "user-1", { patientId: alheio, toothNumber: 11 }),
    ).rejects.toThrow(NotFoundException);
    await expect(
      service.createTreatmentPlanOption("clinic-1", {
        patientId: alheio,
        label: "Opção A",
        description: "Tratamento completo",
      }),
    ).rejects.toThrow(NotFoundException);

    expect(prisma.clinicalRecord.create).not.toHaveBeenCalled();
    expect(prisma.odontogram.create).not.toHaveBeenCalled();
    expect(prisma.periodontalEntry.create).not.toHaveBeenCalled();
    expect(prisma.treatmentPlanOption.create).not.toHaveBeenCalled();
  });

  it("a checagem filtra por clinicId — não confere o id sozinho", async () => {
    const prisma = fakePrisma();
    const service = new ClinicalRecordsService(prisma);

    await service.upsertAnamnesis("clinic-1", "user-1", { patientId: "patient-1" });

    expect(prisma.patient.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "patient-1", clinicId: "clinic-1" } }),
    );
  });
});
