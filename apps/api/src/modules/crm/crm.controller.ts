import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { Role } from "@odontoflow/db";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { TenantGuard } from "../../common/guards/tenant.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentTenant } from "../../common/decorators/current-tenant.decorator";
import { CrmService } from "./crm.service";
import { CreateOpportunityDto } from "./dto/create-opportunity.dto";
import { UpdateOpportunityDto } from "./dto/update-opportunity.dto";

@Controller("crm")
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
// CRM é tela de gestão comercial: dentista não entra (decisão do dono do produto)
@Roles(Role.CLINIC_ADMIN, Role.ASSISTANT, Role.ORG_ADMIN)
export class CrmController {
  constructor(private readonly crm: CrmService) {}

  @Get("opportunities")
  listOpportunities(@CurrentTenant() clinicId: string) {
    return this.crm.listOpportunities(clinicId);
  }

  @Post("opportunities")
  create(@CurrentTenant() clinicId: string, @Body() dto: CreateOpportunityDto) {
    return this.crm.create(clinicId, dto);
  }

  @Patch("opportunities/:id")
  update(@CurrentTenant() clinicId: string, @Param("id") id: string, @Body() dto: UpdateOpportunityDto) {
    return this.crm.update(clinicId, id, dto);
  }

  @Get("pending-budgets")
  listPendingBudgets(@CurrentTenant() clinicId: string) {
    return this.crm.listPendingBudgetsFollowup(clinicId);
  }
}
