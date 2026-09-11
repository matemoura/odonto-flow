import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { TenantGuard } from "../../common/guards/tenant.guard";
import { CurrentTenant } from "../../common/decorators/current-tenant.decorator";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { PatientLoginDto } from "./dto/patient-login.dto";
import { RefreshDto } from "./dto/refresh.dto";

@Controller("auth")
@UseGuards(TenantGuard)
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  // Login por força bruta é o alvo clássico — 5 tentativas/min por IP.
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post("login")
  login(@Body() dto: LoginDto, @CurrentTenant() clinicId: string) {
    return this.auth.loginStaff(dto.email, dto.password, clinicId);
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post("patient/login")
  loginPatient(@Body() dto: PatientLoginDto, @CurrentTenant() clinicId: string) {
    return this.auth.loginPatientMock(dto.email, clinicId);
  }

  /**
   * Troca o refresh token (30d) por um access token novo (1h) — não depende
   * de tenant/membership, só o TenantGuard da classe resolvendo o slug (sem
   * checar vínculo, já que não há usuário autenticado nesta rota).
   */
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post("refresh")
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refreshStaffSession(dto.refreshToken);
  }
}
