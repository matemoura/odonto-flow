import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { Role } from "@odontoflow/db";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { TenantGuard } from "../../common/guards/tenant.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentTenant } from "../../common/decorators/current-tenant.decorator";
import { TeamService } from "./team.service";
import { CreateTeamMemberDto } from "./dto/create-team-member.dto";
import { UpdateTeamMemberRoleDto } from "./dto/update-team-member-role.dto";

@Controller("team")
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Roles(Role.CLINIC_ADMIN, Role.ORG_ADMIN)
export class TeamController {
  constructor(private readonly team: TeamService) {}

  @Get()
  findAll(@CurrentTenant() clinicId: string) {
    return this.team.list(clinicId);
  }

  @Post()
  create(@CurrentTenant() clinicId: string, @Body() dto: CreateTeamMemberDto) {
    return this.team.create(clinicId, dto);
  }

  @Patch(":id/role")
  updateRole(@CurrentTenant() clinicId: string, @Param("id") id: string, @Body() dto: UpdateTeamMemberRoleDto) {
    return this.team.updateRole(clinicId, id, dto);
  }

  @Delete(":id")
  @HttpCode(204)
  remove(@CurrentTenant() clinicId: string, @Param("id") id: string) {
    return this.team.remove(clinicId, id);
  }
}
