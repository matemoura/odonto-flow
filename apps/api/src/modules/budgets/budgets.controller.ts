import { Body, Controller, Param, Patch, Post, Get, Query, UseGuards } from "@nestjs/common";
import { Role } from "@odontoflow/db";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { TenantGuard } from "../../common/guards/tenant.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentTenant } from "../../common/decorators/current-tenant.decorator";
import { BudgetsService } from "./budgets.service";
import { ContractsService } from "./contracts.service";
import { CreateBudgetDto } from "./dto/create-budget.dto";
import { UpdateBudgetStatusDto } from "./dto/update-budget-status.dto";

@Controller("budgets")
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Roles(Role.CLINIC_ADMIN, Role.DENTIST, Role.ASSISTANT, Role.ORG_ADMIN)
export class BudgetsController {
  constructor(
    private readonly budgets: BudgetsService,
    private readonly contracts: ContractsService,
  ) {}

  @Get()
  list(@CurrentTenant() clinicId: string, @Query("patientId") patientId: string) {
    return this.budgets.listForPatient(clinicId, patientId);
  }

  @Post()
  create(@CurrentTenant() clinicId: string, @Body() dto: CreateBudgetDto) {
    return this.budgets.create(clinicId, dto);
  }

  @Patch(":id/status")
  updateStatus(
    @CurrentTenant() clinicId: string,
    @Param("id") id: string,
    @Body() dto: UpdateBudgetStatusDto,
  ) {
    return this.budgets.updateStatus(clinicId, id, dto.status, {
      installments: dto.installments,
      firstDueDate: dto.firstDueDate,
    });
  }

  @Patch(":id/items/:itemId/execute")
  executeItem(@CurrentTenant() clinicId: string, @Param("id") id: string, @Param("itemId") itemId: string) {
    return this.budgets.executeItem(clinicId, id, itemId);
  }

  @Get(":id/contract")
  getContract(@CurrentTenant() clinicId: string, @Param("id") id: string) {
    return this.contracts.getForBudget(clinicId, id);
  }

  @Post(":id/contract")
  generateContract(@CurrentTenant() clinicId: string, @Param("id") id: string) {
    return this.contracts.generateForBudget(clinicId, id);
  }
}
