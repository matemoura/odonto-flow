import { BadRequestException, NotFoundException } from "@nestjs/common";
import { CertificatesService } from "./certificates.service";
import { PrismaService } from "../../database/prisma.service";

/** Clínica em UTC-3: é o que revela uma data gravada ou impressa no fuso errado. */
const FUSO = "America/Sao_Paulo";

function fakePrisma(overrides: Record<string, unknown> = {}) {
  return {
    patient: { findFirst: jest.fn().mockResolvedValue({ id: "patient-1", name: "Joana Teste" }) },
    professional: {
      findFirst: jest
        .fn()
        .mockResolvedValue({ id: "prof-1", croNumber: "12345", user: { name: "Dra. Ana Prado" } }),
    },
    clinic: {
      findUniqueOrThrow: jest
        .fn()
        .mockResolvedValue({ id: "clinic-1", name: "Clínica Vila Nova", timezone: FUSO }),
    },
    certificate: { create: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(), delete: jest.fn() },
    ...overrides,
  } as unknown as PrismaService;
}

const BASE_DTO = {
  patientId: "patient-1",
  professionalId: "prof-1",
  type: "ATTENDANCE" as const,
  visitDate: "2026-03-10",
};

describe("CertificatesService.create — validações", () => {
  it("recusa atestado pro acompanhante sem o nome dele", async () => {
    const prisma = fakePrisma();
    const service = new CertificatesService(prisma);

    await expect(service.create("clinic-1", { ...BASE_DTO, beneficiary: "COMPANION" })).rejects.toThrow(
      BadRequestException,
    );
    expect(prisma.certificate.create).not.toHaveBeenCalled();
  });

  it("recusa atestado médico sem informar os dias de afastamento", async () => {
    const prisma = fakePrisma();
    const service = new CertificatesService(prisma);

    await expect(service.create("clinic-1", { ...BASE_DTO, type: "MEDICAL" })).rejects.toThrow(BadRequestException);
    expect(prisma.certificate.create).not.toHaveBeenCalled();
  });

  it("recusa quando o paciente não pertence a esta clínica", async () => {
    const prisma = fakePrisma({ patient: { findFirst: jest.fn().mockResolvedValue(null) } });
    const service = new CertificatesService(prisma);

    await expect(service.create("clinic-1", BASE_DTO)).rejects.toThrow(NotFoundException);
  });

  it("recusa quando o profissional não pertence a esta clínica", async () => {
    const prisma = fakePrisma({ professional: { findFirst: jest.fn().mockResolvedValue(null) } });
    const service = new CertificatesService(prisma);

    await expect(service.create("clinic-1", BASE_DTO)).rejects.toThrow(NotFoundException);
  });
});

describe("CertificatesService.create — conteúdo gerado", () => {
  it("atestado de comparecimento pro próprio paciente menciona o período quando informado", async () => {
    const prisma = fakePrisma();
    (prisma.certificate.create as jest.Mock).mockImplementation(({ data }) => data);
    const service = new CertificatesService(prisma);

    const result = await service.create("clinic-1", {
      ...BASE_DTO,
      arrivalTime: "14:00",
      departureTime: "15:30",
    });

    expect(result.content).toContain("ATESTADO DE COMPARECIMENTO");
    expect(result.content).toContain("Joana Teste");
    expect(result.content).toContain("das 14:00 às 15:30");
  });

  it("não inclui nome nem CRO do profissional no conteúdo (assinatura/carimbo são físicos, feitos depois de imprimir)", async () => {
    const prisma = fakePrisma();
    (prisma.certificate.create as jest.Mock).mockImplementation(({ data }) => data);
    const service = new CertificatesService(prisma);

    const result = await service.create("clinic-1", BASE_DTO);

    expect(result.content).not.toContain("Dra. Ana Prado");
    expect(result.content).not.toContain("CRO");
  });

  it("atestado de comparecimento pro acompanhante menciona o nome do acompanhante e do paciente", async () => {
    const prisma = fakePrisma();
    (prisma.certificate.create as jest.Mock).mockImplementation(({ data }) => data);
    const service = new CertificatesService(prisma);

    const result = await service.create("clinic-1", {
      ...BASE_DTO,
      beneficiary: "COMPANION",
      companionName: "Carlos Pai",
    });

    expect(result.content).toContain("Carlos Pai");
    expect(result.content).toContain("acompanhando o(a) paciente Joana Teste");
  });

  it("atestado médico inclui os dias de afastamento e o CID quando informado", async () => {
    const prisma = fakePrisma();
    (prisma.certificate.create as jest.Mock).mockImplementation(({ data }) => data);
    const service = new CertificatesService(prisma);

    const result = await service.create("clinic-1", {
      ...BASE_DTO,
      type: "MEDICAL",
      daysOff: 3,
      cidCode: "K04.0",
    });

    expect(result.content).toContain("ATESTADO MÉDICO");
    expect(result.content).toContain("necessita de 3 dia(s) de afastamento");
    expect(result.content).toContain("CID: K04.0.");
  });

  it("atestado médico sem CID não menciona a linha de CID", async () => {
    const prisma = fakePrisma();
    (prisma.certificate.create as jest.Mock).mockImplementation(({ data }) => data);
    const service = new CertificatesService(prisma);

    const result = await service.create("clinic-1", { ...BASE_DTO, type: "MEDICAL", daysOff: 2 });

    expect(result.content).not.toContain("CID");
  });
});

describe("CertificatesService.findOne", () => {
  it("lança NotFoundException quando o atestado não existe nesta clínica", async () => {
    const prisma = fakePrisma();
    (prisma.certificate.findFirst as jest.Mock).mockResolvedValue(null);
    const service = new CertificatesService(prisma);

    await expect(service.findOne("clinic-1", "cert-1")).rejects.toThrow(NotFoundException);
  });

  it("retorna o atestado quando ele existe nesta clínica", async () => {
    const prisma = fakePrisma();
    (prisma.certificate.findFirst as jest.Mock).mockResolvedValue({ id: "cert-1", content: "..." });
    const service = new CertificatesService(prisma);

    const result = await service.findOne("clinic-1", "cert-1");

    expect(result).toEqual({ id: "cert-1", content: "..." });
  });
});

describe("CertificatesService.remove", () => {
  it("recusa remover um atestado que não existe nesta clínica", async () => {
    const prisma = fakePrisma();
    (prisma.certificate.findFirst as jest.Mock).mockResolvedValue(null);
    const service = new CertificatesService(prisma);

    await expect(service.remove("clinic-1", "cert-1")).rejects.toThrow(NotFoundException);
    expect(prisma.certificate.delete).not.toHaveBeenCalled();
  });

  it("remove quando o atestado existe nesta clínica", async () => {
    const prisma = fakePrisma();
    (prisma.certificate.findFirst as jest.Mock).mockResolvedValue({ id: "cert-1" });
    const service = new CertificatesService(prisma);

    await service.remove("clinic-1", "cert-1");

    expect(prisma.certificate.delete).toHaveBeenCalledWith({ where: { id: "cert-1" } });
  });
});

describe("CertificatesService.create — data da consulta no fuso da clínica", () => {
  it("grava a meia-noite do dia civil da clínica e imprime esse mesmo dia", async () => {
    const prisma = fakePrisma();
    (prisma.certificate.create as jest.Mock).mockImplementation((args: { data: { content: string } }) => args.data);
    const service = new CertificatesService(prisma);

    const result = await service.create("clinic-1", BASE_DTO);

    // 10/03 à meia-noite em São Paulo é 03:00Z — literal em Z de propósito:
    // um esperado montado com `new Date("2026-03-10T00:00:00")` seguiria o
    // fuso do processo e não pegaria o bug.
    expect(result.visitDate).toEqual(new Date("2026-03-10T03:00:00.000Z"));
    // E o texto impresso tem que dizer 10, não 9 — é o que o paciente lê.
    expect(result.content).toContain("10 de março de 2026");
  });
});
