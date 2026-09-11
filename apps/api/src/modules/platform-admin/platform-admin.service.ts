import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { getClinicSubscriptionStatus } from "../../common/subscription/clinic-subscription.util";
import { SuspendClinicDto } from "./dto/suspend-clinic.dto";
import { UpdatePlatformSettingsDto } from "./dto/update-platform-settings.dto";

const DEFAULT_GRACE_PERIOD_DAYS = 14;

@Injectable()
export class PlatformAdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getSettings() {
    const settings = await this.prisma.platformSettings.findUnique({ where: { id: "singleton" } });
    return settings ?? { id: "singleton", delinquencyGracePeriodDays: DEFAULT_GRACE_PERIOD_DAYS, updatedAt: new Date() };
  }

  updateSettings(dto: UpdatePlatformSettingsDto) {
    return this.prisma.platformSettings.upsert({
      where: { id: "singleton" },
      update: { delinquencyGracePeriodDays: dto.delinquencyGracePeriodDays },
      create: { id: "singleton", delinquencyGracePeriodDays: dto.delinquencyGracePeriodDays },
    });
  }

  /** Todas as clínicas da plataforma (cross-tenant de propósito — só o dono acessa isso). */
  async listClinics() {
    const [clinics, settings] = await Promise.all([
      this.prisma.clinic.findMany({
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          slug: true,
          plan: true,
          createdAt: true,
          lastPaymentAt: true,
          manuallySuspendedAt: true,
          manuallySuspendedReason: true,
          _count: { select: { memberships: true, patients: true } },
        },
      }),
      this.getSettings(),
    ]);

    return clinics.map((clinic) => ({
      ...clinic,
      subscription: getClinicSubscriptionStatus(clinic, settings.delinquencyGracePeriodDays),
    }));
  }

  /**
   * Números do negócio da plataforma (não de uma clínica): crescimento, saúde
   * das assinaturas, mix de planos e volume agregado.
   */
  async getMetrics() {
    const clinics = await this.listClinics();
    const agora = new Date();
    const inicioDoMes = new Date(agora.getFullYear(), agora.getMonth(), 1);

    const [consultasNoMes, totalPacientes, totalProfissionais] = await Promise.all([
      this.prisma.appointment.count({ where: { startAt: { gte: inicioDoMes } } }),
      this.prisma.patient.count(),
      this.prisma.professional.count(),
    ]);

    const emDia = clinics.filter((c) => !c.subscription.blocked).length;
    const suspensas = clinics.filter((c) => c.subscription.manuallySuspended).length;
    const inadimplentes = clinics.filter(
      (c) => c.subscription.delinquent && !c.subscription.manuallySuspended,
    ).length;

    // 6 meses cheios terminando no atual — eixo fixo para o gráfico não "pular"
    // de tamanho quando um mês fica sem cadastro nenhum.
    const meses: { mes: string; total: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(agora.getFullYear(), agora.getMonth() - i, 1);
      meses.push({ mes: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, total: 0 });
    }
    for (const clinic of clinics) {
      const d = clinic.createdAt;
      const chave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const balde = meses.find((m) => m.mes === chave);
      if (balde) balde.total += 1;
    }

    const planos = new Map<string, number>();
    for (const clinic of clinics) {
      const plano = clinic.plan ?? "sem plano";
      planos.set(plano, (planos.get(plano) ?? 0) + 1);
    }

    return {
      clinicas: { total: clinics.length, emDia, inadimplentes, suspensas },
      novasPorMes: meses,
      porPlano: [...planos.entries()]
        .map(([plano, total]) => ({ plano, total }))
        .sort((a, b) => b.total - a.total),
      agregados: { pacientes: totalPacientes, profissionais: totalProfissionais, consultasNoMes },
    };
  }

  /** Registra um pagamento manualmente — até um gateway de verdade ser plugado, é assim que se "marca como pago". */
  async registerPayment(clinicId: string) {
    await this.assertExists(clinicId);
    return this.prisma.clinic.update({ where: { id: clinicId }, data: { lastPaymentAt: new Date() } });
  }

  async suspend(clinicId: string, dto: SuspendClinicDto) {
    await this.assertExists(clinicId);
    return this.prisma.clinic.update({
      where: { id: clinicId },
      data: {
        manuallySuspendedAt: new Date(),
        manuallySuspendedReason: dto.reason ?? "Suspensa pelo administrador da plataforma.",
      },
    });
  }

  async reactivate(clinicId: string) {
    await this.assertExists(clinicId);
    return this.prisma.clinic.update({
      where: { id: clinicId },
      data: { manuallySuspendedAt: null, manuallySuspendedReason: null },
    });
  }

  private async assertExists(clinicId: string) {
    const clinic = await this.prisma.clinic.findUnique({ where: { id: clinicId } });
    if (!clinic) {
      throw new NotFoundException("Clínica não encontrada.");
    }
    return clinic;
  }
}
