import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import * as argon2 from "argon2";
import { Role } from "@odontoflow/db";
import { PrismaService } from "../../database/prisma.service";
import { CreateTeamMemberDto } from "./dto/create-team-member.dto";
import { UpdateTeamMemberRoleDto } from "./dto/update-team-member-role.dto";

@Injectable()
export class TeamService {
  constructor(private readonly prisma: PrismaService) {}

  list(clinicId: string) {
    return this.prisma.clinicMembership.findMany({
      where: { clinicId },
      include: {
        user: {
          select: { name: true, email: true, professional: { select: { id: true, croNumber: true, specialty: true, color: true, bio: true } } },
        },
      },
      orderBy: { createdAt: "asc" },
    });
  }

  async create(clinicId: string, dto: CreateTeamMemberDto) {
    const existingUser = await this.prisma.user.findUnique({ where: { email: dto.email } });

    if (existingUser) {
      const alreadyMember = await this.prisma.clinicMembership.findUnique({
        where: { clinicId_userId: { clinicId, userId: existingUser.id } },
      });
      if (alreadyMember) {
        throw new ConflictException("Este e-mail já faz parte da equipe desta clínica.");
      }
    }

    if (!existingUser && !dto.password) {
      throw new BadRequestException("Defina uma senha para a pessoa conseguir entrar.");
    }

    const user =
      existingUser ??
      (await this.prisma.user.create({
        data: { email: dto.email, name: dto.name, passwordHash: await argon2.hash(dto.password!) },
      }));

    const membership = await this.prisma.clinicMembership.create({
      data: { clinicId, userId: user.id, role: dto.role },
    });

    if (dto.role === Role.DENTIST || dto.atendePacientes === true) {
      const alreadyProfessional = await this.prisma.professional.findUnique({ where: { userId: user.id } });
      if (!alreadyProfessional) {
        await this.prisma.professional.create({
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
    }

    return membership;
  }

  async updateRole(clinicId: string, membershipId: string, dto: UpdateTeamMemberRoleDto) {
    const membership = await this.findMembership(clinicId, membershipId);

    if (membership.role === Role.CLINIC_ADMIN && dto.role !== Role.CLINIC_ADMIN) {
      await this.assertNaoEhOUltimoAdmin(clinicId, membershipId);
    }

    // Ficha de Professional = "esta pessoa atende". Dentista sempre tem;
    // admin só se pedirem (é o caso do dono que também atende).
    const deveAtender = dto.role === Role.DENTIST || dto.atendePacientes === true;
    if (deveAtender) {
      const alreadyProfessional = await this.prisma.professional.findUnique({ where: { userId: membership.userId } });
      if (!alreadyProfessional) {
        await this.prisma.professional.create({ data: { clinicId, userId: membership.userId } });
      }
    }

    return this.prisma.clinicMembership.update({ where: { id: membershipId }, data: { role: dto.role } });
  }

  async remove(clinicId: string, membershipId: string) {
    const membership = await this.findMembership(clinicId, membershipId);

    if (membership.role === Role.CLINIC_ADMIN) {
      await this.assertNaoEhOUltimoAdmin(clinicId, membershipId);
    }

    await this.prisma.clinicMembership.delete({ where: { id: membershipId } });
  }

  private async findMembership(clinicId: string, membershipId: string) {
    const membership = await this.prisma.clinicMembership.findFirst({ where: { id: membershipId, clinicId } });
    if (!membership) {
      throw new NotFoundException("Membro da equipe não encontrado.");
    }
    return membership;
  }

  /** Impede deixar a clínica sem nenhum CLINIC_ADMIN (trocar de cargo ou remover o último). */
  private async assertNaoEhOUltimoAdmin(clinicId: string, membershipId: string) {
    const outrosAdmins = await this.prisma.clinicMembership.count({
      where: { clinicId, role: Role.CLINIC_ADMIN, id: { not: membershipId } },
    });
    if (outrosAdmins === 0) {
      throw new BadRequestException("Não é possível remover o último administrador da clínica.");
    }
  }
}
