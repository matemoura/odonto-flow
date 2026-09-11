import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { Role } from "@odontoflow/db";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { TenantGuard } from "../../common/guards/tenant.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentTenant } from "../../common/decorators/current-tenant.decorator";
import { ProfessionalsService } from "./professionals.service";
import { CreateProfessionalDto } from "./dto/create-professional.dto";
import { UpdateProfessionalDto } from "./dto/update-professional.dto";

@Controller("professionals")
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class ProfessionalsController {
  constructor(private readonly professionals: ProfessionalsService) {}

  @Get()
  @Roles(Role.CLINIC_ADMIN, Role.DENTIST, Role.ASSISTANT, Role.ORG_ADMIN)
  findAll(@CurrentTenant() clinicId: string) {
    return this.professionals.findAll(clinicId);
  }

  @Get(":id")
  @Roles(Role.CLINIC_ADMIN, Role.DENTIST, Role.ASSISTANT, Role.ORG_ADMIN)
  findOne(@CurrentTenant() clinicId: string, @Param("id") id: string) {
    return this.professionals.findOne(clinicId, id);
  }

  @Post()
  @Roles(Role.CLINIC_ADMIN, Role.ORG_ADMIN)
  create(@CurrentTenant() clinicId: string, @Body() dto: CreateProfessionalDto) {
    return this.professionals.create(clinicId, dto);
  }

  @Patch(":id")
  @Roles(Role.CLINIC_ADMIN, Role.ORG_ADMIN)
  update(@CurrentTenant() clinicId: string, @Param("id") id: string, @Body() dto: UpdateProfessionalDto) {
    return this.professionals.update(clinicId, id, dto);
  }
}
