import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import * as argon2 from "argon2";
import { Role } from "@odontoflow/db";
import { PrismaService } from "../../database/prisma.service";
import { getClinicSubscriptionStatus } from "../../common/subscription/clinic-subscription.util";

type Membership = { clinicId: string; role: Role };

@Injectable()
export class AuthService {
  private readonly accessSecret: string;
  private readonly refreshSecret: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    config: ConfigService,
  ) {
    // Lidos (e validados) uma vez na subida da API — nunca em cada login.
    this.accessSecret = config.getOrThrow<string>("JWT_ACCESS_SECRET");
    this.refreshSecret = config.getOrThrow<string>("JWT_REFRESH_SECRET");
  }

  private signAccessToken(userId: string, email: string, memberships: Membership[]) {
    return this.jwt.signAsync(
      { sub: userId, email, memberships },
      { secret: this.accessSecret, expiresIn: "1h" },
    );
  }

  private signSuperAdminAccessToken(userId: string, email: string) {
    return this.jwt.signAsync(
      { sub: userId, email, memberships: [], isSuperAdmin: true },
      { secret: this.accessSecret, expiresIn: "1h" },
    );
  }

  private signRefreshToken(userId: string) {
    return this.jwt.signAsync({ sub: userId, type: "refresh" }, { secret: this.refreshSecret, expiresIn: "30d" });
  }

  /**
   * Barra login (equipe ou paciente) de uma clínica suspensa manualmente ou
   * inadimplente há mais dias que a carência da plataforma — mesma regra do
   * TenantGuard (ver clinic-subscription.util), checada aqui também pra dar
   * uma mensagem clara já na tela de login, em vez de deixar a pessoa entrar
   * e só descobrir o bloqueio no primeiro request depois.
   */
  private async assertClinicActive(clinicId: string) {
    const [clinic, settings] = await Promise.all([
      this.prisma.clinic.findUniqueOrThrow({
        where: { id: clinicId },
        select: { createdAt: true, lastPaymentAt: true, manuallySuspendedAt: true },
      }),
      this.prisma.platformSettings.findUnique({ where: { id: "singleton" } }),
    ]);
    const gracePeriodDays = settings?.delinquencyGracePeriodDays ?? 14;
    const status = getClinicSubscriptionStatus(clinic, gracePeriodDays);
    if (status.blocked) {
      throw new ForbiddenException(
        status.manuallySuspended
          ? "Acesso desta clínica está suspenso. Entre em contato com o suporte."
          : "Assinatura em atraso — acesso suspenso. Entre em contato com o suporte pra regularizar.",
      );
    }
  }

  async loginStaff(email: string, password: string, clinicId: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { memberships: true },
    });

    const membershipHere = user?.memberships.find((m) => m.clinicId === clinicId);
    if (!user || !user.passwordHash || !membershipHere) {
      throw new UnauthorizedException("E-mail ou senha inválidos.");
    }

    const passwordOk = await argon2.verify(user.passwordHash, password);
    if (!passwordOk) {
      throw new UnauthorizedException("E-mail ou senha inválidos.");
    }

    await this.assertClinicActive(clinicId);

    const memberships = await this.expandMembershipsWithOrgAdmin(user.id, user.memberships);
    const [accessToken, refreshToken] = await Promise.all([
      this.signAccessToken(user.id, user.email, memberships),
      this.signRefreshToken(user.id),
    ]);

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, name: user.name, email: user.email, role: membershipHere.role },
    };
  }

  /**
   * Login do dono da plataforma — sem clínica nenhuma envolvida. Só usuários
   * com `isSuperAdmin=true` (setado direto no banco, sem UI de auto-promoção).
   */
  async loginSuperAdmin(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash || !user.isSuperAdmin) {
      throw new UnauthorizedException("E-mail ou senha inválidos.");
    }

    const passwordOk = await argon2.verify(user.passwordHash, password);
    if (!passwordOk) {
      throw new UnauthorizedException("E-mail ou senha inválidos.");
    }

    const [accessToken, refreshToken] = await Promise.all([
      this.signSuperAdminAccessToken(user.id, user.email),
      this.signRefreshToken(user.id),
    ]);

    return { accessToken, refreshToken, user: { id: user.id, name: user.name, email: user.email } };
  }

  /**
   * Token de acesso dura só 1h — sem isso a equipe é deslogada sem aviso no
   * meio do expediente. O refresh token (30d) é trocado por um access token
   * novo aqui; as memberships são recalculadas do banco a cada troca (não
   * ficam presas ao que era verdade há 30 dias).
   */
  async refreshStaffSession(refreshToken: string) {
    let payload: { sub: string; type?: string };
    try {
      payload = await this.jwt.verifyAsync(refreshToken, { secret: this.refreshSecret });
    } catch {
      throw new UnauthorizedException("Sessão expirada — entre novamente.");
    }
    if (payload.type !== "refresh") {
      throw new UnauthorizedException("Sessão expirada — entre novamente.");
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { memberships: true },
    });
    if (!user) {
      throw new UnauthorizedException("Sessão expirada — entre novamente.");
    }

    if (user.isSuperAdmin) {
      const accessToken = await this.signSuperAdminAccessToken(user.id, user.email);
      return { accessToken };
    }

    const memberships = await this.expandMembershipsWithOrgAdmin(user.id, user.memberships);
    const accessToken = await this.signAccessToken(user.id, user.email, memberships);
    return { accessToken };
  }

  /**
   * Fase 6 — um ORG_ADMIN administra a rede inteira, não uma clínica
   * específica (ver OrganizationMembership). Para que TenantGuard/RolesGuard
   * continuem funcionando sem nenhuma mudança, expandimos aqui cada
   * OrganizationMembership em uma "membership virtual" {clinicId, role:
   * ORG_ADMIN} para toda clínica da rede que o usuário ainda não tenha um
   * ClinicMembership direto (esse sempre tem precedência).
   */
  private async expandMembershipsWithOrgAdmin(
    userId: string,
    directMemberships: Array<{ clinicId: string; role: Role }>,
  ) {
    const orgMemberships = await this.prisma.organizationMembership.findMany({
      where: { userId },
      select: { organizationId: true },
    });
    if (orgMemberships.length === 0) {
      return directMemberships.map((m) => ({ clinicId: m.clinicId, role: m.role }));
    }

    const clinicsInOrgs = await this.prisma.clinic.findMany({
      where: { organizationId: { in: orgMemberships.map((m) => m.organizationId) } },
      select: { id: true },
    });

    const directClinicIds = new Set(directMemberships.map((m) => m.clinicId));
    const virtual = clinicsInOrgs
      .filter((c) => !directClinicIds.has(c.id))
      .map((c) => ({ clinicId: c.id, role: Role.ORG_ADMIN as Role }));

    return [...directMemberships.map((m) => ({ clinicId: m.clinicId, role: m.role })), ...virtual];
  }

  /**
   * Login "mock" do portal do paciente — só confere o e-mail cadastrado na
   * clínica, sem senha/OTP. Ver PatientLoginDto para o porquê.
   */
  async loginPatientMock(email: string, clinicId: string) {
    const patient = await this.prisma.patient.findFirst({
      where: { clinicId, email },
    });

    if (!patient) {
      throw new NotFoundException("Não encontramos esse e-mail cadastrado nesta clínica.");
    }

    await this.assertClinicActive(clinicId);

    let userId = patient.userId;
    if (!userId) {
      const existingUser = await this.prisma.user.findUnique({ where: { email } });
      const user =
        existingUser ??
        (await this.prisma.user.create({ data: { email, name: patient.name } }));
      await this.prisma.patient.update({ where: { id: patient.id }, data: { userId: user.id } });
      userId = user.id;
    }

    if (!patient.consentLGPDAt) {
      throw new ForbiddenException("Consentimento LGPD pendente — procure a recepção da clínica.");
    }

    // Portal do paciente é majoritariamente leitura e não tem refresh — token
    // mais longo que o da equipe (que agora renova sozinho a cada 1h).
    const accessToken = await this.jwt.signAsync(
      {
        sub: userId,
        email,
        memberships: [{ clinicId, role: Role.PATIENT }],
        patientId: patient.id,
      },
      { secret: this.accessSecret, expiresIn: "24h" },
    );

    return { accessToken, patient: { id: patient.id, name: patient.name } };
  }
}
