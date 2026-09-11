import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { Role } from "@odontoflow/db";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { TenantGuard } from "../../common/guards/tenant.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentTenant } from "../../common/decorators/current-tenant.decorator";
import { CurrentUser, AuthenticatedUser } from "../../common/decorators/current-user.decorator";
import { OrganizationsService } from "./organizations.service";
import { CreateOrganizationDto } from "./dto/create-organization.dto";
import { JoinOrganizationDto } from "./dto/join-organization.dto";
import { TransferPatientDto } from "./dto/transfer-patient.dto";
import { SyncProceduresDto } from "./dto/sync-procedures.dto";

@Controller("organizations")
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Roles(Role.CLINIC_ADMIN, Role.ORG_ADMIN)
export class OrganizationsController {
  constructor(private readonly organizations: OrganizationsService) {}

  @Get("current")
  getCurrent(@CurrentTenant() clinicId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.organizations.getCurrent(clinicId, user.userId);
  }

  @Post()
  create(
    @CurrentTenant() clinicId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateOrganizationDto,
  ) {
    return this.organizations.create(clinicId, user.userId, dto);
  }

  @Post("join")
  join(@CurrentTenant() clinicId: string, @CurrentUser() user: AuthenticatedUser, @Body() dto: JoinOrganizationDto) {
    return this.organizations.join(clinicId, user.userId, dto);
  }

  @Get("dashboard")
  getDashboard(@CurrentTenant() clinicId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.organizations.getDashboard(clinicId, user.userId);
  }

  @Post("transfer-patient")
  transferPatient(
    @CurrentTenant() clinicId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: TransferPatientDto,
  ) {
    return this.organizations.transferPatient(clinicId, user.userId, dto);
  }

  @Post("procedures/sync")
  syncProcedures(
    @CurrentTenant() clinicId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SyncProceduresDto,
  ) {
    return this.organizations.syncProcedures(clinicId, user.userId, dto);
  }
}
