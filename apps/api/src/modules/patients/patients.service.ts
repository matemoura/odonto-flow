import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import type { AuthenticatedUser } from "../../common/decorators/current-user.decorator";
import { ehDentista, SEM_PROFISSIONAL } from "../../common/scope/dentist-scope.util";
import { limitesDaPagina, montarPagina } from "../../common/paginacao";

/** Acima disto, um `<select>` deixa de ser usável e a clínica precisa de busca. */
const TETO_DO_SELETOR = 500;
import { CreatePatientDto } from "./dto/create-patient.dto";
import { UpdatePatientDto } from "./dto/update-patient.dto";

@Injectable()
export class PatientsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * `professionalId` restringe aos pacientes que aquele profissional atendeu —
   * é o escopo do dentista. Nulo = sem restrição (admin, recepção).
   */
  async findAll(
    clinicId: string,
    search?: string,
    professionalId?: string | null,
    paginacao: { page?: number; pageSize?: number } = {},
  ) {
    const where = {
      clinicId,
      ...(search ? { name: { contains: search, mode: "insensitive" as const } } : {}),
      ...(professionalId ? { appointments: { some: { professionalId } } } : {}),
    };
    const { skip, take, page, pageSize } = limitesDaPagina(paginacao.page, paginacao.pageSize);

    // `count` junto: sem o total a tela não tem como dizer "1 de 12" nem saber
    // se existe próxima página — e o usuário não descobre que há mais gente.
    const [itens, total] = await Promise.all([
      this.prisma.patient.findMany({ where, orderBy: { name: "asc" }, skip, take }),
      this.prisma.patient.count({ where }),
    ]);

    return montarPagina(itens, total, page, pageSize);
  }

  /**
   * Lista enxuta para preencher seletor de paciente (agendar, CRM, indicação,
   * transferência). Aqui a paginação atrapalharia: um `<select>` com 25 de 900
   * pacientes esconde a pessoa que se está procurando.
   *
   * O que a torna segura é o `select` de dois campos — o problema de carregar
   * "todos os pacientes" era trazer a FICHA inteira de cada um (CPF, RG,
   * endereço, contato de emergência). Id e nome de 2 mil pacientes são alguns
   * poucos KB.
   *
   * O teto ainda existe: acima dele a clínica precisa de um seletor com busca,
   * e `truncado` avisa a tela para dizer isso em vez de esconder gente.
   */
  async listarParaSelecao(clinicId: string, professionalId?: string | null) {
    const itens = await this.prisma.patient.findMany({
      where: {
        clinicId,
        ...(professionalId ? { appointments: { some: { professionalId } } } : {}),
      },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
      take: TETO_DO_SELETOR + 1,
    });

    return {
      itens: itens.slice(0, TETO_DO_SELETOR),
      truncado: itens.length > TETO_DO_SELETOR,
    };
  }

  async findOne(clinicId: string, id: string, professionalId?: string | null) {
    const patient = await this.prisma.patient.findFirst({
      where: {
        id,
        clinicId,
        ...(professionalId ? { appointments: { some: { professionalId } } } : {}),
      },
    });
    if (!patient) {
      // mesma mensagem de "não existe": um dentista não deve conseguir descobrir
      // pela resposta que o paciente existe mas é de outro profissional
      throw new NotFoundException("Paciente não encontrado.");
    }
    return patient;
  }

  /**
   * Id do `Professional` do usuário quando ele é DENTIST nesta clínica — o
   * filtro a aplicar nas consultas. Nulo para os demais papéis (veem tudo).
   */
  async escopoDoProfissional(user: AuthenticatedUser, clinicId: string): Promise<string | null> {
    if (!ehDentista(user, clinicId)) return null;
    const profissional = await this.prisma.professional.findFirst({
      where: { clinicId, userId: user.userId },
      select: { id: true },
    });
    return profissional?.id ?? SEM_PROFISSIONAL;
  }

  create(clinicId: string, dto: CreatePatientDto) {
    return this.prisma.patient.create({
      data: {
        clinicId,
        name: dto.name,
        cpf: dto.cpf,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
        phone: dto.phone,
        email: dto.email,
      },
    });
  }

  async update(clinicId: string, id: string, dto: UpdatePatientDto) {
    const atual = await this.findOne(clinicId, id);
    const { consentLGPD, ...campos } = dto;

    return this.prisma.patient.update({
      where: { id },
      data: {
        ...campos,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
        // Não sobrescreve a data original a cada salvamento: o que importa
        // juridicamente é QUANDO o paciente consentiu, não quando alguém
        // reabriu o cadastro. `false` revoga.
        consentLGPDAt:
          consentLGPD === undefined
            ? undefined
            : consentLGPD
              ? (atual.consentLGPDAt ?? new Date())
              : null,
      },
    });
  }
}
