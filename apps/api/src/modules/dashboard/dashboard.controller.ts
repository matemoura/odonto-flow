import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { Role } from "@odontoflow/db";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { TenantGuard } from "../../common/guards/tenant.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentTenant } from "../../common/decorators/current-tenant.decorator";
import { DashboardService } from "./dashboard.service";

@Controller("dashboard")
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Roles(Role.CLINIC_ADMIN, Role.ORG_ADMIN)
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get("overview")
  getOverview(@CurrentTenant() clinicId: string, @Query("from") from: string, @Query("to") to: string) {
    return this.dashboard.getOverview(clinicId, from, to);
  }
}
