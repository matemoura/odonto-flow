import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import type { AuthenticatedUser } from "../../common/decorators/current-user.decorator";
import { ehDentista, SEM_PROFISSIONAL } from "../../common/scope/dentist-scope.util";
import { CreatePatientDto } from "./dto/create-patient.dto";
import { UpdatePatientDto } from "./dto/update-patient.dto";

@Injectable()
export class PatientsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * `professionalId` restringe aos pacientes que aquele profissional atendeu —
   * é o escopo do dentista. Nulo = sem restrição (admin, recepção).
   */
  findAll(clinicId: string, search?: string, professionalId?: string | null) {
    return this.prisma.patient.findMany({
      where: {
        clinicId,
        ...(search
          ? { name: { contains: search, mode: "insensitive" as const } }
          : {}),
        ...(professionalId ? { appointments: { some: { professionalId } } } : {}),
      },
      orderBy: { name: "asc" },
    });
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
    await this.findOne(clinicId, id);
    return this.prisma.patient.update({
      where: { id },
      data: {
        ...dto,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
      },
    });
  }
}
