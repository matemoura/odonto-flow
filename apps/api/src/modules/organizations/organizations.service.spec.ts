import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { OrganizationsService } from "./organizations.service";
import { PrismaService } from "../../database/prisma.service";

/** Modelos com `updateMany` reatribuído numa transferência de paciente (ver transferPatient). */
const PATIENT_SCOPED_MODELS = [
  "appointment",
  "budget",
  "clinicalRecord",
  "odontogram",
  "document",
  "contract",
  "creditScoreQuery",
  "cRMOpportunity",
  "orthodonticTreatment",
  "facialPlanning",
] as const;

function fakePrisma(overrides: Record<string, unknown> = {}) {
  const patientScopedModels = Object.fromEntries(
    PATIENT_SCOPED_MODELS.map((model) => [model, { updateMany: jest.fn().mockResolvedValue({ count: 0 }) }]),
  );

  return {
    ...patientScopedModels,
    clinic: {
      findUniqueOrThrow: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    organization: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    patient: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    procedure: {
      findMany: jest.fn(),
      createMany: jest.fn(),
    },
    organizationMembership: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    referral: {
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    auditLog: {
      create: jest.fn(),
    },
    $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
    ...overrides,
  } as unknown as PrismaService;
}

describe("OrganizationsService.transferPatient", () => {
  it("recusa transferência entre clínicas de redes diferentes", async () => {
    const prisma = fakePrisma();
    (prisma.patient.findFirst as jest.Mock).mockResolvedValue({ id: "patient-1", clinicId: "clinic-a" });
    (prisma.clinic.findUniqueOrThrow as jest.Mock).mockResolvedValue({ id: "clinic-a", organizationId: "org-1" });
    (prisma.clinic.findUnique as jest.Mock).mockResolvedValue({ id: "clinic-b", organizationId: "org-2" });

    const service = new OrganizationsService(prisma);
    await expect(
      service.transferPatient("clinic-a", "user-1", { patientId: "patient-1", toClinicId: "clinic-b" }),
    ).rejects.toThrow(BadRequestException);
  });

  it("recusa quando o solicitante não é ORG_ADMIN da rede", async () => {
    const prisma = fakePrisma();
    (prisma.patient.findFirst as jest.Mock).mockResolvedValue({ id: "patient-1", clinicId: "clinic-a" });
    (prisma.clinic.findUniqueOrThrow as jest.Mock).mockResolvedValue({ id: "clinic-a", organizationId: "org-1" });
    (prisma.clinic.findUnique as jest.Mock).mockResolvedValue({ id: "clinic-b", organizationId: "org-1" });
    (prisma.organizationMembership.findUnique as jest.Mock).mockResolvedValue(null);

    const service = new OrganizationsService(prisma);
    await expect(
      service.transferPatient("clinic-a", "user-1", { patientId: "patient-1", toClinicId: "clinic-b" }),
    ).rejects.toThrow(ForbiddenException);
  });

  it("transfere e grava auditoria quando tudo é válido", async () => {
    const prisma = fakePrisma();
    (prisma.patient.findFirst as jest.Mock).mockResolvedValue({ id: "patient-1", clinicId: "clinic-a" });
    (prisma.clinic.findUniqueOrThrow as jest.Mock).mockResolvedValue({ id: "clinic-a", organizationId: "org-1" });
    (prisma.clinic.findUnique as jest.Mock).mockResolvedValue({ id: "clinic-b", organizationId: "org-1" });
    (prisma.organizationMembership.findUnique as jest.Mock).mockResolvedValue({ id: "mem-1" });
    (prisma.patient.update as jest.Mock).mockResolvedValue({ id: "patient-1", clinicId: "clinic-b" });

    const service = new OrganizationsService(prisma);
    const result = await service.transferPatient("clinic-a", "user-1", {
      patientId: "patient-1",
      toClinicId: "clinic-b",
    });

    expect(result.clinicId).toBe("clinic-b");
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "transfer", entityType: "Patient" }),
      }),
    );
  });

  it("leva o histórico clínico junto — reatribui clinicId em toda tabela ligada ao paciente, numa única transação", async () => {
    const prisma = fakePrisma();
    (prisma.patient.findFirst as jest.Mock).mockResolvedValue({ id: "patient-1", clinicId: "clinic-a" });
    (prisma.clinic.findUniqueOrThrow as jest.Mock).mockResolvedValue({ id: "clinic-a", organizationId: "org-1" });
    (prisma.clinic.findUnique as jest.Mock).mockResolvedValue({ id: "clinic-b", organizationId: "org-1" });
    (prisma.organizationMembership.findUnique as jest.Mock).mockResolvedValue({ id: "mem-1" });
    (prisma.patient.update as jest.Mock).mockResolvedValue({ id: "patient-1", clinicId: "clinic-b" });

    const service = new OrganizationsService(prisma);
    await service.transferPatient("clinic-a", "user-1", { patientId: "patient-1", toClinicId: "clinic-b" });

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);

    const patientScope = { clinicId: "clinic-a", patientId: "patient-1" };
    for (const model of PATIENT_SCOPED_MODELS) {
      expect((prisma[model] as unknown as { updateMany: jest.Mock }).updateMany).toHaveBeenCalledWith({
        where: patientScope,
        data: { clinicId: "clinic-b" },
      });
    }

    // Referral não tem uma coluna `patientId` única — o paciente pode ser quem indicou
    // ou quem foi indicado, então as duas direções precisam ser reatribuídas.
    expect(prisma.referral.updateMany).toHaveBeenCalledWith({
      where: { clinicId: "clinic-a", referrerPatientId: "patient-1" },
      data: { clinicId: "clinic-b" },
    });
    expect(prisma.referral.updateMany).toHaveBeenCalledWith({
      where: { clinicId: "clinic-a", referredPatientId: "patient-1" },
      data: { clinicId: "clinic-b" },
    });

    expect(prisma.patient.update).toHaveBeenCalledWith({
      where: { id: "patient-1" },
      data: { clinicId: "clinic-b" },
    });
  });
});

describe("OrganizationsService.create / join", () => {
  it("recusa criar uma rede para uma clínica que já faz parte de outra", async () => {
    const prisma = fakePrisma();
    (prisma.clinic.findUniqueOrThrow as jest.Mock).mockResolvedValue({ id: "clinic-a", organizationId: "org-1" });

    const service = new OrganizationsService(prisma);
    await expect(
      service.create("clinic-a", "user-1", { name: "Grupo X", slug: "grupo-x" }),
    ).rejects.toThrow(BadRequestException);
  });

  it("cria a rede, conecta a clínica atual e torna o solicitante ORG_ADMIN", async () => {
    const prisma = fakePrisma({
      organization: { create: jest.fn().mockResolvedValue({ id: "org-1", name: "Grupo X", clinics: [] }) },
    });
    (prisma.clinic.findUniqueOrThrow as jest.Mock).mockResolvedValue({ id: "clinic-a", organizationId: null });

    const service = new OrganizationsService(prisma);
    await service.create("clinic-a", "user-1", { name: "Grupo X", slug: "grupo-x" });

    expect((prisma as unknown as { organization: { create: jest.Mock } }).organization.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: "Grupo X",
          slug: "grupo-x",
          clinics: { connect: { id: "clinic-a" } },
          memberships: { create: { userId: "user-1", role: "ORG_ADMIN" } },
        }),
      }),
    );
  });

  it("recusa entrar numa rede quando a clínica já pertence a outra", async () => {
    const prisma = fakePrisma();
    (prisma.clinic.findUniqueOrThrow as jest.Mock).mockResolvedValue({ id: "clinic-a", organizationId: "org-1" });

    const service = new OrganizationsService(prisma);
    await expect(service.join("clinic-a", "user-1", { organizationId: "org-2" })).rejects.toThrow(
      BadRequestException,
    );
  });

  it("recusa entrar com um código de rede inexistente", async () => {
    const prisma = fakePrisma();
    (prisma.clinic.findUniqueOrThrow as jest.Mock).mockResolvedValue({ id: "clinic-a", organizationId: null });
    (prisma.organization.findUnique as jest.Mock).mockResolvedValue(null);

    const service = new OrganizationsService(prisma);
    await expect(service.join("clinic-a", "user-1", { organizationId: "org-inexistente" })).rejects.toThrow(
      NotFoundException,
    );
  });
});

describe("OrganizationsService.syncProcedures", () => {
  it("não recria procedimentos que já existem no destino (comparação por nome, case-insensitive)", async () => {
    const prisma = fakePrisma();
    (prisma.clinic.findUniqueOrThrow as jest.Mock).mockResolvedValue({ organizationId: "org-1" });
    (prisma.organizationMembership.findUnique as jest.Mock).mockResolvedValue({ id: "mem-1" });
    (prisma.clinic.findFirst as jest.Mock) = jest.fn().mockResolvedValue({ id: "clinic-a", organizationId: "org-1" });
    (prisma.clinic.findMany as jest.Mock).mockResolvedValue([{ id: "clinic-b", name: "Unidade B" }]);
    (prisma.procedure.findMany as jest.Mock)
      .mockResolvedValueOnce([
        { name: "Restauração", code: null, defaultPriceCents: 25000 },
        { name: "Avaliação clínica", code: null, defaultPriceCents: 0 },
      ])
      .mockResolvedValueOnce([{ name: "restauração" }]);

    const service = new OrganizationsService(prisma);
    const result = await service.syncProcedures("clinic-a", "user-1", { sourceClinicId: "clinic-a" });

    expect(result).toEqual([{ clinic: { id: "clinic-b", name: "Unidade B" }, created: 1 }]);
    expect(prisma.procedure.createMany).toHaveBeenCalledWith({
      data: [{ clinicId: "clinic-b", name: "Avaliação clínica", code: null, defaultPriceCents: 0 }],
    });
  });
});
