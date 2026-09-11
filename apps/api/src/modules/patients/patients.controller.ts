import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { Role } from "@odontoflow/db";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { TenantGuard } from "../../common/guards/tenant.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentTenant } from "../../common/decorators/current-tenant.decorator";
import { CurrentUser, type AuthenticatedUser } from "../../common/decorators/current-user.decorator";
import { PatientsService } from "./patients.service";
import { CreditScoreService } from "./credit-score.service";
import { CreatePatientDto } from "./dto/create-patient.dto";
import { UpdatePatientDto } from "./dto/update-patient.dto";
import { QueryCreditScoreDto } from "./dto/query-credit-score.dto";

@Controller("patients")
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Roles(Role.CLINIC_ADMIN, Role.DENTIST, Role.ASSISTANT, Role.ORG_ADMIN)
export class PatientsController {
  constructor(
    private readonly patients: PatientsService,
    private readonly creditScore: CreditScoreService,
  ) {}

  @Get()
  async findAll(
    @CurrentTenant() clinicId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query("search") search?: string,
  ) {
    const escopo = await this.patients.escopoDoProfissional(user, clinicId);
    return this.patients.findAll(clinicId, search, escopo);
  }

  @Get(":id")
  async findOne(
    @CurrentTenant() clinicId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ) {
    const escopo = await this.patients.escopoDoProfissional(user, clinicId);
    return this.patients.findOne(clinicId, id, escopo);
  }

  @Post()
  @Roles(Role.CLINIC_ADMIN, Role.ASSISTANT, Role.ORG_ADMIN)
  create(@CurrentTenant() clinicId: string, @Body() dto: CreatePatientDto) {
    return this.patients.create(clinicId, dto);
  }

  @Patch(":id")
  async update(
    @CurrentTenant() clinicId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdatePatientDto,
  ) {
    const escopo = await this.patients.escopoDoProfissional(user, clinicId);
    await this.patients.findOne(clinicId, id, escopo);
    return this.patients.update(clinicId, id, dto);
  }

  @Get(":id/credit-score")
  getCreditScore(@CurrentTenant() clinicId: string, @Param("id") id: string) {
    return this.creditScore.getLatest(clinicId, id);
  }

  @Post(":id/credit-score")
  queryCreditScore(
    @CurrentTenant() clinicId: string,
    @Param("id") id: string,
    @Body() dto: QueryCreditScoreDto,
  ) {
    return this.creditScore.query(clinicId, id, dto.consent);
  }
}
