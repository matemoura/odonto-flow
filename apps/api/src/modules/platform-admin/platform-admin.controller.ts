import { Body, Controller, Get, Param, Patch, Post, Put, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { SuperAdminGuard } from "../../common/guards/super-admin.guard";
import { PlatformAdminService } from "./platform-admin.service";
import { SuspendClinicDto } from "./dto/suspend-clinic.dto";
import { UpdatePlatformSettingsDto } from "./dto/update-platform-settings.dto";

/** Painel do dono da plataforma — cross-tenant de propósito, sem TenantGuard/RolesGuard. */
@Controller("platform-admin")
@UseGuards(JwtAuthGuard, SuperAdminGuard)
export class PlatformAdminController {
  constructor(private readonly platformAdmin: PlatformAdminService) {}

  @Get("clinics")
  listClinics() {
    return this.platformAdmin.listClinics();
  }

  @Get("metrics")
  getMetrics() {
    return this.platformAdmin.getMetrics();
  }

  @Post("clinics/:id/register-payment")
  registerPayment(@Param("id") id: string) {
    return this.platformAdmin.registerPayment(id);
  }

  @Patch("clinics/:id/suspend")
  suspend(@Param("id") id: string, @Body() dto: SuspendClinicDto) {
    return this.platformAdmin.suspend(id, dto);
  }

  @Patch("clinics/:id/reactivate")
  reactivate(@Param("id") id: string) {
    return this.platformAdmin.reactivate(id);
  }

  @Get("settings")
  getSettings() {
    return this.platformAdmin.getSettings();
  }

  @Put("settings")
  updateSettings(@Body() dto: UpdatePlatformSettingsDto) {
    return this.platformAdmin.updateSettings(dto);
  }
}
