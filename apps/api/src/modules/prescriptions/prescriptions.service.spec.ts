import { NotFoundException } from "@nestjs/common";
import { PrescriptionsService } from "./prescriptions.service";
import { PrismaService } from "../../database/prisma.service";

function fakePrisma(overrides: Record<string, unknown> = {}) {
  return {
    professional: {
      findFirst: jest
        .fn()
        .mockResolvedValue({ id: "prof-1", croNumber: "CRO-SP 1", user: { name: "Dra. Teste" } }),
    },
    patient: { findFirst: jest.fn().mockResolvedValue({ id: "patient-1" }), findUniqueOrThrow: jest.fn().mockResolvedValue({ id: "patient-1", name: "Paciente Teste" }) },
    appointment: { findFirst: jest.fn().mockResolvedValue({ id: "appt-1" }) },
    clinic: { findUniqueOrThrow: jest.fn().mockResolvedValue({ id: "clinic-1", name: "Clínica Teste" }) },
    anamnesis: { findUnique: jest.fn().mockResolvedValue(null) },
    procedure: { findFirst: jest.fn().mockResolvedValue({ id: "proc-1" }) },
    medication: { findMany: jest.fn().mockResolvedValue([]) },
    prescription: { create: jest.fn(), findMany: jest.fn(), findFirst: jest.fn() },
    ...overrides,
  } as unknown as PrismaService;
}

describe("PrescriptionsService.create", () => {
  it("recusa emitir receita para quem não é profissional desta clínica", async () => {
    const prisma = fakePrisma({ professional: { findFirst: jest.fn().mockResolvedValue(null) } });
    const service = new PrescriptionsService(prisma);

    await expect(
      service.create("clinic-1", "user-1", { patientId: "p1", items: [{ posology: "...", customName: "X" }] }),
    ).rejects.toThrow(NotFoundException);
    expect(prisma.prescription.create).not.toHaveBeenCalled();
  });

  it("recusa paciente de outra clínica", async () => {
    const prisma = fakePrisma({ patient: { findFirst: jest.fn().mockResolvedValue(null) } });
    const service = new PrescriptionsService(prisma);

    await expect(
      service.create("clinic-1", "user-1", { patientId: "alheio", items: [{ posology: "...", customName: "X" }] }),
    ).rejects.toThrow(NotFoundException);
    expect(prisma.prescription.create).not.toHaveBeenCalled();
  });

  it("recusa um appointmentId que não é deste paciente nesta clínica", async () => {
    const prisma = fakePrisma({ appointment: { findFirst: jest.fn().mockResolvedValue(null) } });
    const service = new PrescriptionsService(prisma);

    await expect(
      service.create("clinic-1", "user-1", {
        patientId: "p1",
        appointmentId: "appt-de-outro-paciente",
        items: [{ posology: "...", customName: "X" }],
      }),
    ).rejects.toThrow(NotFoundException);
    expect(prisma.prescription.create).not.toHaveBeenCalled();
  });

  it("recusa um medicamento que não existe no catálogo", async () => {
    const prisma = fakePrisma({ medication: { findMany: jest.fn().mockResolvedValue([]) } });
    const service = new PrescriptionsService(prisma);

    await expect(
      service.create("clinic-1", "user-1", { patientId: "p1", items: [{ medicationId: "inexistente", posology: "..." }] }),
    ).rejects.toThrow(NotFoundException);
  });

  it("cruza os medicamentos escolhidos com as flags de risco marcadas na anamnese do paciente", async () => {
    const prisma = fakePrisma({
      anamnesis: {
        findUnique: jest.fn().mockResolvedValue({
          hasHypertension: true,
          hasDiabetes: false,
          hasHeartCondition: false,
          hasBleedingDisorder: false,
          isPregnant: false,
          hasChronicKidneyDisease: true,
          hasCancerOrImmunosuppression: false,
        }),
      },
      medication: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: "med-ibuprofeno",
            name: "Ibuprofeno",
            riskNotes: [
              { riskFlag: "HYPERTENSION", severity: "CAUTION", note: "Retém sódio." },
              { riskFlag: "CHRONIC_KIDNEY_DISEASE", severity: "AVOID", note: "Nefrotóxico." },
              { riskFlag: "PREGNANT", severity: "AVOID", note: "Evitar na gestação." },
            ],
          },
        ]),
      },
    });
    const service = new PrescriptionsService(prisma);

    await service.create("clinic-1", "user-1", {
      patientId: "p1",
      items: [{ medicationId: "med-ibuprofeno", posology: "400 mg a cada 8 h" }],
    });

    const call = (prisma.prescription.create as jest.Mock).mock.calls[0][0];
    // Hipertensão e renal crônico estão marcados na anamnese — os dois avisos aparecem.
    // Gestante não está marcado — o aviso de gestante não deve aparecer.
    expect(call.data.riskWarningsShown).toContain("Cautela: Ibuprofeno");
    expect(call.data.riskWarningsShown).toContain("Retém sódio");
    expect(call.data.riskWarningsShown).toContain("Evitar: Ibuprofeno");
    expect(call.data.riskWarningsShown).toContain("Nefrotóxico");
    expect(call.data.riskWarningsShown).not.toContain("gestante");
    expect(call.data.riskWarningsShown).not.toContain("Evitar na gestação");
  });

  it("não grava aviso de risco quando o paciente não tem anamnese registrada", async () => {
    const prisma = fakePrisma({
      medication: {
        findMany: jest.fn().mockResolvedValue([
          { id: "med-1", name: "Ibuprofeno", riskNotes: [{ riskFlag: "HYPERTENSION", severity: "CAUTION", note: "..." }] },
        ]),
      },
    });
    const service = new PrescriptionsService(prisma);

    await service.create("clinic-1", "user-1", {
      patientId: "p1",
      items: [{ medicationId: "med-1", posology: "..." }],
    });

    const call = (prisma.prescription.create as jest.Mock).mock.calls[0][0];
    expect(call.data.riskWarningsShown).toBeUndefined();
  });

  it("aceita um item fora do catálogo, identificado só pelo nome digitado", async () => {
    const prisma = fakePrisma();
    const service = new PrescriptionsService(prisma);

    await service.create("clinic-1", "user-1", {
      patientId: "p1",
      items: [{ customName: "Chá de camomila", posology: "1 xícara à noite" }],
    });

    const call = (prisma.prescription.create as jest.Mock).mock.calls[0][0];
    expect(call.data.items.create[0].medicationName).toBe("Chá de camomila");
  });

  it("o conteúdo impresso traz o nome e o CRO de quem prescreveu", async () => {
    const prisma = fakePrisma();
    const service = new PrescriptionsService(prisma);

    await service.create("clinic-1", "user-1", {
      patientId: "p1",
      items: [{ customName: "Dipirona", posology: "500 mg a cada 4 h" }],
    });

    const call = (prisma.prescription.create as jest.Mock).mock.calls[0][0];
    expect(call.data.content).toContain("Dra. Teste");
    expect(call.data.content).toContain("CRO-SP 1");
  });
});
