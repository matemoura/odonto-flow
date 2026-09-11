import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Role } from "@odontoflow/db";
import { PrismaService } from "../../database/prisma.service";
import { CreateOrganizationDto } from "./dto/create-organization.dto";
import { JoinOrganizationDto } from "./dto/join-organization.dto";
import { TransferPatientDto } from "./dto/transfer-patient.dto";
import { SyncProceduresDto } from "./dto/sync-procedures.dto";

/**
 * Fase 6 — rede/franquia. Uma Organization agrupa várias Clinic (tenants).
 * Neste MVP não existe subdomínio/tenant próprio para a organização: tudo é
 * acessado a partir da clínica logada (CurrentTenant), que resolve a
 * organização a que pertence. `OrganizationMembership.id` funciona como
 * "código de convite" para outra clínica entrar na rede (ver `join`).
 */
@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertOrgAdmin(organizationId: string, userId: string) {
    const membership = await this.prisma.organizationMembership.findUnique({
      where: { organizationId_userId: { organizationId, userId } },
    });
    if (!membership) {
      throw new ForbiddenException("Você não administra esta rede de clínicas.");
    }
  }

  async getCurrent(clinicId: string, userId: string) {
    const clinic = await this.prisma.clinic.findUniqueOrThrow({
      where: { id: clinicId },
      select: { organizationId: true },
    });

    if (!clinic.organizationId) {
      return { organization: null, isOrgAdmin: false };
    }

    const organization = await this.prisma.organization.findUnique({
      where: { id: clinic.organizationId },
      include: { clinics: { select: { id: true, name: true, slug: true } } },
    });
    const membership = await this.prisma.organizationMembership.findUnique({
      where: { organizationId_userId: { organizationId: clinic.organizationId, userId } },
    });

    return { organization, isOrgAdmin: Boolean(membership) };
  }

  async create(clinicId: string, userId: string, dto: CreateOrganizationDto) {
    const clinic = await this.prisma.clinic.findUniqueOrThrow({ where: { id: clinicId } });
    if (clinic.organizationId) {
      throw new BadRequestException("Esta clínica já faz parte de uma rede.");
    }

    const organization = await this.prisma.organization.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        clinics: { connect: { id: clinicId } },
        memberships: { create: { userId, role: Role.ORG_ADMIN } },
      },
      include: { clinics: { select: { id: true, name: true, slug: true } } },
    });

    return organization;
  }

  async join(clinicId: string, userId: string, dto: JoinOrganizationDto) {
    const clinic = await this.prisma.clinic.findUniqueOrThrow({ where: { id: clinicId } });
    if (clinic.organizationId) {
      throw new BadRequestException("Esta clínica já faz parte de uma rede.");
    }

    const organization = await this.prisma.organization.findUnique({ where: { id: dto.organizationId } });
    if (!organization) {
      throw new NotFoundException("Código de rede não encontrado.");
    }

    await this.prisma.$transaction([
      this.prisma.clinic.update({ where: { id: clinicId }, data: { organizationId: organization.id } }),
      this.prisma.organizationMembership.upsert({
        where: { organizationId_userId: { organizationId: organization.id, userId } },
        create: { organizationId: organization.id, userId, role: Role.ORG_ADMIN },
        update: {},
      }),
    ]);

    return this.getCurrent(clinicId, userId);
  }

  async getDashboard(clinicId: string, userId: string) {
    const clinic = await this.prisma.clinic.findUniqueOrThrow({
      where: { id: clinicId },
      select: { organizationId: true },
    });
    if (!clinic.organizationId) {
      throw new BadRequestException("Esta clínica não faz parte de uma rede.");
    }
    await this.assertOrgAdmin(clinic.organizationId, userId);

    const clinics = await this.prisma.clinic.findMany({
      where: { organizationId: clinic.organizationId },
      select: { id: true, name: true, slug: true },
    });

    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

    const metrics = await Promise.all(
      clinics.map(async (c) => {
        const [patients, appointmentsThisMonth, pendingBudgets, revenueAgg] = await Promise.all([
          this.prisma.patient.count({ where: { clinicId: c.id } }),
          this.prisma.appointment.count({
            where: { clinicId: c.id, startAt: { gte: monthStart, lt: monthEnd } },
          }),
          this.prisma.budget.count({ where: { clinicId: c.id, status: "PENDING" } }),
          this.prisma.transaction.aggregate({
            where: { clinicId: c.id, type: "INCOME", paidAt: { gte: monthStart, lt: monthEnd } },
            _sum: { amountCents: true },
          }),
        ]);
        return {
          clinic: c,
          patients,
          appointmentsThisMonth,
          pendingBudgets,
          revenueThisMonthCents: revenueAgg._sum.amountCents ?? 0,
        };
      }),
    );

    return {
      clinics: metrics,
      totals: {
        patients: metrics.reduce((sum, m) => sum + m.patients, 0),
        appointmentsThisMonth: metrics.reduce((sum, m) => sum + m.appointmentsThisMonth, 0),
        pendingBudgets: metrics.reduce((sum, m) => sum + m.pendingBudgets, 0),
        revenueThisMonthCents: metrics.reduce((sum, m) => sum + m.revenueThisMonthCents, 0),
      },
    };
  }

  async transferPatient(clinicId: string, userId: string, dto: TransferPatientDto) {
    const patient = await this.prisma.patient.findFirst({ where: { id: dto.patientId, clinicId } });
    if (!patient) {
      throw new NotFoundException("Paciente não encontrado nesta clínica.");
    }

    const [fromClinic, toClinic] = await Promise.all([
      this.prisma.clinic.findUniqueOrThrow({ where: { id: clinicId } }),
      this.prisma.clinic.findUnique({ where: { id: dto.toClinicId } }),
    ]);
    if (!toClinic) {
      throw new NotFoundException("Clínica de destino não encontrada.");
    }
    if (!fromClinic.organizationId || fromClinic.organizationId !== toClinic.organizationId) {
      throw new BadRequestException("As duas clínicas precisam pertencer à mesma rede.");
    }
    await this.assertOrgAdmin(fromClinic.organizationId, userId);

    // A transferência leva o histórico clínico junto (não só o cadastro do
    // paciente) — cada uma dessas tabelas carrega seu próprio clinicId,
    // então precisam ser reatribuídas explicitamente numa única transação.
    // `professionalId`/`procedureId` em registros antigos continuam
    // apontando para quem/o que pertence à clínica de origem, de propósito:
    // o profissional que atendeu e o procedimento faturado não mudam
    // retroativamente, só o "dono" (clinicId) do registro do paciente.
    const patientScope = { clinicId, patientId: dto.patientId };
    const [updated] = await this.prisma.$transaction([
      this.prisma.patient.update({ where: { id: dto.patientId }, data: { clinicId: dto.toClinicId } }),
      this.prisma.appointment.updateMany({ where: patientScope, data: { clinicId: dto.toClinicId } }),
      this.prisma.budget.updateMany({ where: patientScope, data: { clinicId: dto.toClinicId } }),
      this.prisma.clinicalRecord.updateMany({ where: patientScope, data: { clinicId: dto.toClinicId } }),
      this.prisma.odontogram.updateMany({ where: patientScope, data: { clinicId: dto.toClinicId } }),
      this.prisma.document.updateMany({ where: patientScope, data: { clinicId: dto.toClinicId } }),
      this.prisma.contract.updateMany({ where: patientScope, data: { clinicId: dto.toClinicId } }),
      this.prisma.creditScoreQuery.updateMany({ where: patientScope, data: { clinicId: dto.toClinicId } }),
      this.prisma.cRMOpportunity.updateMany({ where: patientScope, data: { clinicId: dto.toClinicId } }),
      this.prisma.orthodonticTreatment.updateMany({ where: patientScope, data: { clinicId: dto.toClinicId } }),
      this.prisma.facialPlanning.updateMany({ where: patientScope, data: { clinicId: dto.toClinicId } }),
      this.prisma.referral.updateMany({
        where: { clinicId, referrerPatientId: dto.patientId },
        data: { clinicId: dto.toClinicId },
      }),
      this.prisma.referral.updateMany({
        where: { clinicId, referredPatientId: dto.patientId },
        data: { clinicId: dto.toClinicId },
      }),
      this.prisma.auditLog.create({
        data: {
          clinicId,
          actorId: userId,
          entityType: "Patient",
          entityId: dto.patientId,
          action: "transfer",
          metadata: { fromClinicId: clinicId, toClinicId: dto.toClinicId },
        },
      }),
    ]);

    return updated;
  }

  async syncProcedures(clinicId: string, userId: string, dto: SyncProceduresDto) {
    const clinic = await this.prisma.clinic.findUniqueOrThrow({
      where: { id: clinicId },
      select: { organizationId: true },
    });
    if (!clinic.organizationId) {
      throw new BadRequestException("Esta clínica não faz parte de uma rede.");
    }
    await this.assertOrgAdmin(clinic.organizationId, userId);

    const sourceClinic = await this.prisma.clinic.findFirst({
      where: { id: dto.sourceClinicId, organizationId: clinic.organizationId },
    });
    if (!sourceClinic) {
      throw new NotFoundException("Clínica de origem não encontrada nesta rede.");
    }

    const [sourceProcedures, targetClinics] = await Promise.all([
      this.prisma.procedure.findMany({ where: { clinicId: dto.sourceClinicId } }),
      this.prisma.clinic.findMany({
        where: { organizationId: clinic.organizationId, id: { not: dto.sourceClinicId } },
        select: { id: true, name: true },
      }),
    ]);

    const results = [];
    for (const target of targetClinics) {
      const existingNames = new Set(
        (await this.prisma.procedure.findMany({ where: { clinicId: target.id }, select: { name: true } })).map((p) =>
          p.name.trim().toLowerCase(),
        ),
      );
      const toCreate = sourceProcedures.filter((p) => !existingNames.has(p.name.trim().toLowerCase()));
      if (toCreate.length > 0) {
        await this.prisma.procedure.createMany({
          data: toCreate.map((p) => ({
            clinicId: target.id,
            name: p.name,
            code: p.code,
            defaultPriceCents: p.defaultPriceCents,
          })),
        });
      }
      results.push({ clinic: target, created: toCreate.length });
    }

    return results;
  }
}
