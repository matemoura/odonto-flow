import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { Role } from "@odontoflow/db";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { TenantGuard } from "../../common/guards/tenant.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentTenant } from "../../common/decorators/current-tenant.decorator";
import { ProceduresService } from "./procedures.service";
import { CreateProcedureDto } from "./dto/create-procedure.dto";
import { UpdateProcedureDto } from "./dto/update-procedure.dto";
import { CreateProcedureMaterialDto } from "./dto/create-procedure-material.dto";
import { UpdateProcedureMaterialDto } from "./dto/update-procedure-material.dto";
import { CreateProcedurePrescriptionItemDto } from "./dto/create-procedure-prescription-item.dto";
import { UpdateProcedurePrescriptionItemDto } from "./dto/update-procedure-prescription-item.dto";

@Controller("procedures")
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Roles(Role.CLINIC_ADMIN, Role.DENTIST, Role.ASSISTANT, Role.ORG_ADMIN)
export class ProceduresController {
  constructor(private readonly procedures: ProceduresService) {}

  @Get()
  findAll(@CurrentTenant() clinicId: string) {
    return this.procedures.findAll(clinicId);
  }

  @Get(":id")
  findOne(@CurrentTenant() clinicId: string, @Param("id") id: string) {
    return this.procedures.findOne(clinicId, id);
  }

  @Post()
  @Roles(Role.CLINIC_ADMIN, Role.ORG_ADMIN)
  create(@CurrentTenant() clinicId: string, @Body() dto: CreateProcedureDto) {
    return this.procedures.create(clinicId, dto);
  }

  @Patch(":id")
  @Roles(Role.CLINIC_ADMIN, Role.ORG_ADMIN)
  update(@CurrentTenant() clinicId: string, @Param("id") id: string, @Body() dto: UpdateProcedureDto) {
    return this.procedures.update(clinicId, id, dto);
  }

  @Delete(":id")
  @HttpCode(204)
  @Roles(Role.CLINIC_ADMIN, Role.ORG_ADMIN)
  remove(@CurrentTenant() clinicId: string, @Param("id") id: string) {
    return this.procedures.remove(clinicId, id);
  }

  @Post(":id/materials")
  @Roles(Role.CLINIC_ADMIN, Role.ORG_ADMIN)
  addMaterial(
    @CurrentTenant() clinicId: string,
    @Param("id") id: string,
    @Body() dto: CreateProcedureMaterialDto,
  ) {
    return this.procedures.addMaterial(clinicId, id, dto);
  }

  @Patch(":id/materials/:materialId")
  @Roles(Role.CLINIC_ADMIN, Role.ORG_ADMIN)
  updateMaterial(
    @CurrentTenant() clinicId: string,
    @Param("id") id: string,
    @Param("materialId") materialId: string,
    @Body() dto: UpdateProcedureMaterialDto,
  ) {
    return this.procedures.updateMaterial(clinicId, id, materialId, dto);
  }

  @Delete(":id/materials/:materialId")
  @HttpCode(204)
  @Roles(Role.CLINIC_ADMIN, Role.ORG_ADMIN)
  removeMaterial(@CurrentTenant() clinicId: string, @Param("id") id: string, @Param("materialId") materialId: string) {
    return this.procedures.removeMaterial(clinicId, id, materialId);
  }

  @Post(":id/prescription-items")
  @Roles(Role.CLINIC_ADMIN, Role.ORG_ADMIN)
  addPrescriptionItem(
    @CurrentTenant() clinicId: string,
    @Param("id") id: string,
    @Body() dto: CreateProcedurePrescriptionItemDto,
  ) {
    return this.procedures.addPrescriptionItem(clinicId, id, dto);
  }

  @Patch(":id/prescription-items/:itemId")
  @Roles(Role.CLINIC_ADMIN, Role.ORG_ADMIN)
  updatePrescriptionItem(
    @CurrentTenant() clinicId: string,
    @Param("id") id: string,
    @Param("itemId") itemId: string,
    @Body() dto: UpdateProcedurePrescriptionItemDto,
  ) {
    return this.procedures.updatePrescriptionItem(clinicId, id, itemId, dto);
  }

  @Delete(":id/prescription-items/:itemId")
  @HttpCode(204)
  @Roles(Role.CLINIC_ADMIN, Role.ORG_ADMIN)
  removePrescriptionItem(
    @CurrentTenant() clinicId: string,
    @Param("id") id: string,
    @Param("itemId") itemId: string,
  ) {
    return this.procedures.removePrescriptionItem(clinicId, id, itemId);
  }
}
