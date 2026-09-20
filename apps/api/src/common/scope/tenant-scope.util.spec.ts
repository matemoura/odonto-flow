import { NotFoundException } from "@nestjs/common";
import { assertPacienteDaClinica, assertProfissionalDaClinica } from "./tenant-scope.util";
import { PrismaService } from "../../database/prisma.service";

function fakePrisma(encontrado: boolean) {
  return {
    patient: { findFirst: jest.fn().mockResolvedValue(encontrado ? { id: "p1" } : null) },
    professional: { findFirst: jest.fn().mockResolvedValue(encontrado ? { id: "prof1" } : null) },
  } as unknown as PrismaService;
}

describe("assertPacienteDaClinica", () => {
  it("passa quando o paciente é da clínica", async () => {
    await expect(assertPacienteDaClinica(fakePrisma(true), "clinic-1", "p1")).resolves.toBeUndefined();
  });

  it("recusa quando o paciente é de outra clínica", async () => {
    await expect(assertPacienteDaClinica(fakePrisma(false), "clinic-1", "p1")).rejects.toThrow(
      NotFoundException,
    );
  });

  // O filtro precisa ir na CONSULTA. Buscar por id e comparar o clinicId
  // depois já teria trazido a linha inteira do paciente da outra clínica.
  it("filtra pelas duas colunas na consulta ao banco", async () => {
    const prisma = fakePrisma(true);
    await assertPacienteDaClinica(prisma, "clinic-1", "p1");

    expect(prisma.patient.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "p1", clinicId: "clinic-1" } }),
    );
  });

  // A mensagem não pode distinguir "não existe" de "existe em outra clínica":
  // a diferença sozinha já confirma que aquele id existe na plataforma.
  it("não revela que o paciente existe em outro lugar", async () => {
    await expect(assertPacienteDaClinica(fakePrisma(false), "clinic-1", "p1")).rejects.toThrow(
      "Paciente não encontrado nesta clínica.",
    );
  });
});

describe("assertProfissionalDaClinica", () => {
  it("recusa profissional de outra clínica", async () => {
    await expect(assertProfissionalDaClinica(fakePrisma(false), "clinic-1", "prof1")).rejects.toThrow(
      NotFoundException,
    );
  });

  it("filtra pelas duas colunas na consulta ao banco", async () => {
    const prisma = fakePrisma(true);
    await assertProfissionalDaClinica(prisma, "clinic-1", "prof1");

    expect(prisma.professional.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "prof1", clinicId: "clinic-1" } }),
    );
  });
});
