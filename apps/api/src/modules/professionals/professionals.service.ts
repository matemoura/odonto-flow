import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import * as argon2 from "argon2";
import { Role } from "@odontoflow/db";
import { PrismaService } from "../../database/prisma.service";
import { PAPEIS_CLINICOS } from "../../common/scope/dentist-scope.util";
import { CreateProfessionalDto } from "./dto/create-professional.dto";
import { UpdateProfessionalDto } from "./dto/update-professional.dto";

@Injectable()
export class ProfessionalsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Só quem tem acesso ativo e está num cargo que atende (ver PAPEIS_CLINICOS).
   * Quem foi removido da equipe ou virou ASSISTANT some daqui
   * (ver TeamService.remove / TeamService.updateRole). Admin aparece só se
   * tiver ficha de `Professional` — a ficha é o que diz que ele atende.
   */
  private readonly ativoNaClinica = (clinicId: string) => ({
    user: { memberships: { some: { clinicId, role: { in: PAPEIS_CLINICOS } } } },
  });

  findAll(clinicId: string) {
    return this.prisma.professional.findMany({
      where: { clinicId, ...this.ativoNaClinica(clinicId) },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: "asc" },
    });
  }

  /** Lista pública para o link de agendamento — só os campos exibidos ao paciente. */
  findAllPublic(clinicId: string) {
    return this.prisma.professional.findMany({
      where: { clinicId, ...this.ativoNaClinica(clinicId) },
      select: {
        id: true,
        specialty: true,
        croNumber: true,
        bio: true,
        user: { select: { name: true } },
      },
      orderBy: { createdAt: "asc" },
    });
  }

  async findOne(clinicId: string, id: string) {
    const professional = await this.prisma.professional.findFirst({
      where: { id, clinicId },
      include: { user: { select: { name: true, email: true } } },
    });
    if (!professional) {
      throw new NotFoundException("Profissional não encontrado.");
    }
    return professional;
  }

  async create(clinicId: string, dto: CreateProfessionalDto) {
    const existingUser = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existingUser) {
      const alreadyProfessional = await this.prisma.professional.findUnique({
        where: { userId: existingUser.id },
      });
      if (alreadyProfessional) {
        throw new ConflictException("Já existe um profissional com este e-mail.");
      }
    }

    if (!existingUser && !dto.password) {
      throw new BadRequestException("Defina uma senha para o novo profissional conseguir entrar.");
    }

    const user =
      existingUser ??
      (await this.prisma.user.create({
        data: { email: dto.email, name: dto.name, passwordHash: await argon2.hash(dto.password!) },
      }));

    // Não rebaixa quem já tem cargo que atende: cadastrar o dono como
    // profissional não pode tirar dele o acesso de administrador.
    const membershipAtual = await this.prisma.clinicMembership.findUnique({
      where: { clinicId_userId: { clinicId, userId: user.id } },
    });
    const jaTemCargoClinico = membershipAtual ? PAPEIS_CLINICOS.includes(membershipAtual.role) : false;

    await this.prisma.clinicMembership.upsert({
      where: { clinicId_userId: { clinicId, userId: user.id } },
      update: jaTemCargoClinico ? {} : { role: Role.DENTIST },
      create: { clinicId, userId: user.id, role: Role.DENTIST },
    });

    return this.prisma.professional.create({
      data: {
        clinicId,
        userId: user.id,
        croNumber: dto.croNumber,
        specialty: dto.specialty,
        color: dto.color,
        bio: dto.bio,
      },
    });
  }

  async update(clinicId: string, id: string, dto: UpdateProfessionalDto) {
    await this.findOne(clinicId, id);
    return this.prisma.professional.update({ where: { id }, data: dto });
  }
}
