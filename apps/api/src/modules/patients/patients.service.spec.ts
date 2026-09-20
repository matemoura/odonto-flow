import { NotFoundException } from "@nestjs/common";
import { PatientsService } from "./patients.service";
import { PrismaService } from "../../database/prisma.service";

function fakePrisma(overrides: Record<string, unknown> = {}) {
  return {
    patient: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    professional: { findFirst: jest.fn() },
    ...overrides,
  } as unknown as PrismaService;
}

function usuario(role: string) {
  return { userId: "u1", email: "a@b.com", memberships: [{ clinicId: "clinic-1", role }] };
}

describe("PatientsService.escopoDoProfissional", () => {
  it("não restringe quem não é dentista", async () => {
    const service = new PatientsService(fakePrisma());

    expect(await service.escopoDoProfissional(usuario("CLINIC_ADMIN"), "clinic-1")).toBeNull();
    expect(await service.escopoDoProfissional(usuario("ASSISTANT"), "clinic-1")).toBeNull();
  });

  it("restringe o dentista à ficha de profissional dele", async () => {
    const prisma = fakePrisma();
    (prisma.professional.findFirst as jest.Mock).mockResolvedValue({ id: "prof-9" });
    const service = new PatientsService(prisma);

    expect(await service.escopoDoProfissional(usuario("DENTIST"), "clinic-1")).toBe("prof-9");
  });

  it("dentista sem ficha de profissional não enxerga ninguém (falha fechado)", async () => {
    const prisma = fakePrisma();
    (prisma.professional.findFirst as jest.Mock).mockResolvedValue(null);
    const service = new PatientsService(prisma);

    const escopo = await service.escopoDoProfissional(usuario("DENTIST"), "clinic-1");
    // não pode ser null: null significaria "sem filtro", ou seja, veria tudo
    expect(escopo).not.toBeNull();
    expect(escopo).toBe("__sem_profissional__");
  });
});

describe("PatientsService — escopo do dentista nas consultas", () => {
  it("filtra a listagem pelos pacientes atendidos por aquele profissional", async () => {
    const prisma = fakePrisma();
    const service = new PatientsService(prisma);

    await service.findAll("clinic-1", undefined, "prof-9");

    expect(prisma.patient.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          clinicId: "clinic-1",
          appointments: { some: { professionalId: "prof-9" } },
        }),
      }),
    );
  });

  it("esconde o paciente de outro dentista com o mesmo 404 de inexistente", async () => {
    const prisma = fakePrisma();
    (prisma.patient.findFirst as jest.Mock).mockResolvedValue(null);
    const service = new PatientsService(prisma);

    await expect(service.findOne("clinic-1", "p1", "prof-9")).rejects.toThrow(NotFoundException);
    expect(prisma.patient.findFirst).toHaveBeenLastCalledWith({
      where: { id: "p1", clinicId: "clinic-1", appointments: { some: { professionalId: "prof-9" } } },
    });
  });
});

describe("PatientsService.findOne", () => {
  it("lança NotFoundException quando o paciente não existe nesta clínica", async () => {
    const prisma = fakePrisma();
    (prisma.patient.findFirst as jest.Mock).mockResolvedValue(null);
    const service = new PatientsService(prisma);

    await expect(service.findOne("clinic-1", "p1")).rejects.toThrow(NotFoundException);
  });
});

describe("PatientsService.findAll", () => {
  it("filtra por nome (case-insensitive) só quando `search` é informado", async () => {
    const prisma = fakePrisma();
    const service = new PatientsService(prisma);

    await service.findAll("clinic-1");
    expect(prisma.patient.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({ where: { clinicId: "clinic-1" } }),
    );

    await service.findAll("clinic-1", "Marina");
    expect(prisma.patient.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: { clinicId: "clinic-1", name: { contains: "Marina", mode: "insensitive" } },
      }),
    );
  });
});

describe("PatientsService.update", () => {
  it("verifica que o paciente existe nesta clínica antes de atualizar", async () => {
    const prisma = fakePrisma();
    (prisma.patient.findFirst as jest.Mock).mockResolvedValue(null);
    const service = new PatientsService(prisma);

    await expect(service.update("clinic-1", "p1", { name: "Novo nome" })).rejects.toThrow(NotFoundException);
    expect(prisma.patient.update).not.toHaveBeenCalled();
  });
});

/**
 * Nenhum `findMany` da API tinha `take`: a tela de Pacientes carregava a
 * tabela inteira. Numa clínica com anos de histórico isso estoura a memória do
 * plano free antes de chegar ao navegador.
 */
describe("PatientsService.findAll — paginação", () => {
  it("pede ao banco só a página, e o total à parte", async () => {
    const prisma = fakePrisma();
    (prisma.patient.findMany as jest.Mock).mockResolvedValue([{ id: "p1" }]);
    (prisma.patient.count as jest.Mock).mockResolvedValue(137);
    const service = new PatientsService(prisma);

    const pagina = await service.findAll("clinic-1", undefined, null, { page: 3, pageSize: 10 });

    expect(prisma.patient.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 20, take: 10 }),
    );
    expect(pagina).toMatchObject({ total: 137, page: 3, pageSize: 10, totalDePaginas: 14 });
  });

  it("o mesmo filtro vale para a contagem — senão o total mente", async () => {
    const prisma = fakePrisma();
    (prisma.patient.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.patient.count as jest.Mock).mockResolvedValue(0);
    const service = new PatientsService(prisma);

    await service.findAll("clinic-1", "ana", "prof-9");

    const whereDaBusca = (prisma.patient.findMany as jest.Mock).mock.calls[0][0].where;
    const whereDaContagem = (prisma.patient.count as jest.Mock).mock.calls[0][0].where;
    expect(whereDaContagem).toEqual(whereDaBusca);
    expect(whereDaBusca).toMatchObject({
      clinicId: "clinic-1",
      name: { contains: "ana", mode: "insensitive" },
      appointments: { some: { professionalId: "prof-9" } },
    });
  });

  it("não deixa pedir a tabela inteira por query string", async () => {
    const prisma = fakePrisma();
    (prisma.patient.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.patient.count as jest.Mock).mockResolvedValue(0);
    const service = new PatientsService(prisma);

    await service.findAll("clinic-1", undefined, null, { pageSize: 999999 });

    expect((prisma.patient.findMany as jest.Mock).mock.calls[0][0].take).toBe(100);
  });
});

describe("PatientsService.listarParaSelecao", () => {
  it("traz só id e nome — não a ficha inteira de cada paciente", async () => {
    const prisma = fakePrisma();
    (prisma.patient.findMany as jest.Mock).mockResolvedValue([{ id: "p1", name: "Ana" }]);
    const service = new PatientsService(prisma);

    await service.listarParaSelecao("clinic-1", null);

    // O problema de "carregar todos" era trazer CPF, RG, endereço e contato de
    // emergência de cada um. Dois campos de 2 mil pacientes são poucos KB.
    expect((prisma.patient.findMany as jest.Mock).mock.calls[0][0].select).toEqual({
      id: true,
      name: true,
    });
  });

  it("avisa quando passou do teto, em vez de esconder gente", async () => {
    const prisma = fakePrisma();
    // 501 = teto + 1: é assim que o serviço detecta que há mais.
    (prisma.patient.findMany as jest.Mock).mockResolvedValue(
      Array.from({ length: 501 }, (_, i) => ({ id: `p${i}`, name: `Paciente ${i}` })),
    );
    const service = new PatientsService(prisma);

    const resultado = await service.listarParaSelecao("clinic-1", null);

    expect(resultado.truncado).toBe(true);
    expect(resultado.itens).toHaveLength(500);
  });

  it("dentro do teto, não marca como truncado", async () => {
    const prisma = fakePrisma();
    (prisma.patient.findMany as jest.Mock).mockResolvedValue([{ id: "p1", name: "Ana" }]);
    const service = new PatientsService(prisma);

    await expect(service.listarParaSelecao("clinic-1", null)).resolves.toMatchObject({ truncado: false });
  });
});

/**
 * O login do portal exige consentimento LGPD, e só o agendamento público
 * gravava isso. Quem era cadastrado no balcão era mandado "procurar a
 * recepção" — que não tinha botão nenhum para resolver.
 */
describe("PatientsService.update — consentimento LGPD", () => {
  function prismaComPaciente(consentLGPDAt: Date | null) {
    const prisma = fakePrisma();
    (prisma.patient.findFirst as jest.Mock).mockResolvedValue({ id: "p1", consentLGPDAt });
    return prisma;
  }

  it("registra a data na primeira vez que o consentimento é dado", async () => {
    const prisma = prismaComPaciente(null);
    const service = new PatientsService(prisma);

    await service.update("clinic-1", "p1", { consentLGPD: true });

    const { data } = (prisma.patient.update as jest.Mock).mock.calls[0][0];
    expect(data.consentLGPDAt).toEqual(expect.any(Date));
  });

  // O que importa juridicamente é QUANDO o paciente consentiu, não quando
  // alguém reabriu o cadastro.
  it("preserva a data original em salvamentos seguintes", async () => {
    const original = new Date("2026-01-10T12:00:00Z");
    const prisma = prismaComPaciente(original);
    const service = new PatientsService(prisma);

    await service.update("clinic-1", "p1", { consentLGPD: true, name: "Ana Maria" });

    expect((prisma.patient.update as jest.Mock).mock.calls[0][0].data.consentLGPDAt).toBe(original);
  });

  it("desmarcar revoga, limpando a data", async () => {
    const prisma = prismaComPaciente(new Date());
    const service = new PatientsService(prisma);

    await service.update("clinic-1", "p1", { consentLGPD: false });

    expect((prisma.patient.update as jest.Mock).mock.calls[0][0].data.consentLGPDAt).toBeNull();
  });

  it("não mexe no consentimento quando o campo não é enviado", async () => {
    const prisma = prismaComPaciente(new Date());
    const service = new PatientsService(prisma);

    await service.update("clinic-1", "p1", { name: "Ana" });

    expect((prisma.patient.update as jest.Mock).mock.calls[0][0].data.consentLGPDAt).toBeUndefined();
  });

  // `consentLGPD` é um booleano da API; a coluna é `consentLGPDAt`. Vazar o
  // booleano no spread gravaria um campo que não existe.
  it("não repassa o booleano bruto para o banco", async () => {
    const prisma = prismaComPaciente(null);
    const service = new PatientsService(prisma);

    await service.update("clinic-1", "p1", { consentLGPD: true });

    expect((prisma.patient.update as jest.Mock).mock.calls[0][0].data).not.toHaveProperty("consentLGPD");
  });
});
