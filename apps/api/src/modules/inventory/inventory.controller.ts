import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, StreamableFile, UseGuards } from "@nestjs/common";
import { Role } from "@odontoflow/db";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { TenantGuard } from "../../common/guards/tenant.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentTenant } from "../../common/decorators/current-tenant.decorator";
import { InventoryService } from "./inventory.service";
import { InventoryReportService } from "./inventory-report.service";
import { CreateInventoryItemDto } from "./dto/create-inventory-item.dto";
import { UpdateInventoryItemDto } from "./dto/update-inventory-item.dto";
import { AdjustInventoryItemDto } from "./dto/adjust-inventory-item.dto";

@Controller("inventory-items")
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Roles(Role.CLINIC_ADMIN, Role.ASSISTANT, Role.ORG_ADMIN)
export class InventoryController {
  constructor(
    private readonly inventory: InventoryService,
    private readonly report: InventoryReportService,
  ) {}

  @Get()
  findAll(@CurrentTenant() clinicId: string) {
    return this.inventory.findAll(clinicId);
  }

  @Get("report")
  @Roles(Role.CLINIC_ADMIN, Role.ORG_ADMIN)
  getReport(@CurrentTenant() clinicId: string, @Query("from") from: string, @Query("to") to: string) {
    return this.inventory.getReport(clinicId, from, to);
  }

  @Get("report.xlsx")
  @Roles(Role.CLINIC_ADMIN, Role.ORG_ADMIN)
  async exportReportXlsx(@CurrentTenant() clinicId: string, @Query("from") from: string, @Query("to") to: string) {
    const buffer = await this.report.buildReportWorkbook(clinicId, from, to);
    return new StreamableFile(Buffer.from(buffer), {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      disposition: `attachment; filename="estoque-${from}-a-${to}.xlsx"`,
    });
  }

  @Get(":id")
  findOne(@CurrentTenant() clinicId: string, @Param("id") id: string) {
    return this.inventory.findOne(clinicId, id);
  }

  @Get(":id/movements")
  listMovements(@CurrentTenant() clinicId: string, @Param("id") id: string) {
    return this.inventory.listMovements(clinicId, id);
  }

  @Post()
  @Roles(Role.CLINIC_ADMIN, Role.ORG_ADMIN)
  create(@CurrentTenant() clinicId: string, @Body() dto: CreateInventoryItemDto) {
    return this.inventory.create(clinicId, dto);
  }

  @Patch(":id")
  @Roles(Role.CLINIC_ADMIN, Role.ORG_ADMIN)
  update(@CurrentTenant() clinicId: string, @Param("id") id: string, @Body() dto: UpdateInventoryItemDto) {
    return this.inventory.update(clinicId, id, dto);
  }

  @Post(":id/adjust")
  @Roles(Role.CLINIC_ADMIN, Role.ORG_ADMIN)
  adjust(@CurrentTenant() clinicId: string, @Param("id") id: string, @Body() dto: AdjustInventoryItemDto) {
    return this.inventory.adjust(clinicId, id, dto);
  }

  @Delete(":id")
  @HttpCode(204)
  @Roles(Role.CLINIC_ADMIN, Role.ORG_ADMIN)
  remove(@CurrentTenant() clinicId: string, @Param("id") id: string) {
    return this.inventory.remove(clinicId, id);
  }
}
