import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { Role } from "@odontoflow/db";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { TenantGuard } from "../../common/guards/tenant.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentTenant } from "../../common/decorators/current-tenant.decorator";
import { ReferralsService } from "./referrals.service";
import { CreateReferralDto } from "./dto/create-referral.dto";
import { UpdateReferralStatusDto } from "./dto/update-referral-status.dto";

@Controller("referrals")
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Roles(Role.CLINIC_ADMIN, Role.ASSISTANT, Role.ORG_ADMIN)
export class ReferralsController {
  constructor(private readonly referrals: ReferralsService) {}

  @Get()
  list(@CurrentTenant() clinicId: string) {
    return this.referrals.list(clinicId);
  }

  @Post()
  create(@CurrentTenant() clinicId: string, @Body() dto: CreateReferralDto) {
    return this.referrals.create(clinicId, dto);
  }

  @Patch(":id/status")
  updateStatus(
    @CurrentTenant() clinicId: string,
    @Param("id") id: string,
    @Body() dto: UpdateReferralStatusDto,
  ) {
    return this.referrals.updateStatus(clinicId, id, dto);
  }
}
