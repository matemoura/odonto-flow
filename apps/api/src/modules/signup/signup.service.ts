import { ConflictException, Injectable } from "@nestjs/common";
import * as argon2 from "argon2";
import { Role } from "@odontoflow/db";
import { PrismaService } from "../../database/prisma.service";
import { AuthService } from "../auth/auth.service";
import { CreateSignupDto } from "./dto/create-signup.dto";

/**
 * Auto-cadastro: uma clínica nova cria a própria conta sem precisar de
 * ninguém já logado (diferente de OrganizationsService.join/create, que
 * exige uma clínica/membership existente). Cria Clinic + User(CLINIC_ADMIN)
 * + ClinicMembership numa transação e já devolve os tokens de sessão, pra
 * cair direto no painel sem pedir login de novo.
 */
@Injectable()
export class SignupService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
  ) {}

  async isSlugAvailable(slug: string) {
    const existing = await this.prisma.clinic.findUnique({ where: { slug }, select: { id: true } });
    return { available: !existing };
  }

  async create(dto: CreateSignupDto) {
    const [existingClinic, existingUser] = await Promise.all([
      this.prisma.clinic.findUnique({ where: { slug: dto.clinicSlug } }),
      this.prisma.user.findUnique({ where: { email: dto.adminEmail } }),
    ]);
    if (existingClinic) {
      throw new ConflictException("Esse nome de clínica já está em uso — escolha outro.");
    }
    if (existingUser) {
      throw new ConflictException("Já existe uma conta com esse e-mail.");
    }

    const passwordHash = await argon2.hash(dto.adminPassword);

    const clinic = await this.prisma.$transaction(async (tx) => {
      const clinic = await tx.clinic.create({
        data: { name: dto.clinicName, slug: dto.clinicSlug, plan: dto.plan },
      });
      const user = await tx.user.create({
        data: { name: dto.adminName, email: dto.adminEmail, passwordHash },
      });
      await tx.clinicMembership.create({
        data: { clinicId: clinic.id, userId: user.id, role: Role.CLINIC_ADMIN },
      });
      return clinic;
    });

    // Reaproveita loginStaff (já testado) em vez de duplicar a emissão de
    // token — o custo de reverificar a senha que acabamos de definir é
    // desprezível perto de manter só um caminho de autenticação.
    return this.auth.loginStaff(dto.adminEmail, dto.adminPassword, clinic.id);
  }
}
