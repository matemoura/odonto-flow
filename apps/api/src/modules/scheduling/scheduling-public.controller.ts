import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { TenantGuard } from "../../common/guards/tenant.guard";
import { CurrentTenant } from "../../common/decorators/current-tenant.decorator";
import { PrismaService } from "../../database/prisma.service";
import { ProfessionalsService } from "../professionals/professionals.service";
import { SchedulingService } from "./scheduling.service";
import { CreatePublicAppointmentDto } from "./dto/create-public-appointment.dto";

/**
 * Endpoints sem autenticação usados pelo link público de agendamento
 * (`/agendar/[clinicSlug]` em apps/web). O único controle de acesso aqui é
 * o TenantGuard resolvendo a clínica pelo slug — não expor nada além do
 * necessário para montar o formulário de agendamento.
 */
@Controller("public")
@UseGuards(TenantGuard)
export class SchedulingPublicController {
  constructor(
    private readonly scheduling: SchedulingService,
    private readonly professionals: ProfessionalsService,
    private readonly prisma: PrismaService,
  ) {}

  @Get("clinic")
  async getClinic(@CurrentTenant() clinicId: string) {
    const clinic = await this.prisma.clinic.findUniqueOrThrow({
      where: { id: clinicId },
      select: { name: true, slug: true, timezone: true },
    });
    return clinic;
  }

  @Get("professionals")
  listProfessionals(@CurrentTenant() clinicId: string) {
    return this.professionals.findAllPublic(clinicId);
  }

  /** `from` desloca a janela para frente — é o que permite escolher uma semana futura. */
  @Get("days")
  getDays(
    @CurrentTenant() clinicId: string,
    @Query("professionalId") professionalId: string,
    @Query("count") count?: string,
    @Query("from") from?: string,
  ) {
    return this.scheduling.getBookableDays(clinicId, professionalId, count ? Number(count) : undefined, from);
  }

  @Get("availability")
  getAvailability(
    @CurrentTenant() clinicId: string,
    @Query("professionalId") professionalId: string,
    @Query("date") date: string,
  ) {
    return this.scheduling.getAvailability(clinicId, professionalId, date);
  }

  // Sem login e sem CAPTCHA — limita quantas consultas um IP consegue criar
  // por minuto, pra não lotar a agenda de agendamentos falsos.
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post("appointments")
  createAppointment(@CurrentTenant() clinicId: string, @Body() dto: CreatePublicAppointmentDto) {
    return this.scheduling.createPublicAppointment(clinicId, dto);
  }
}
