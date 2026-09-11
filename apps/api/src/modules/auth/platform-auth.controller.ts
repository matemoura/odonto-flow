import { Body, Controller, Post } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { RefreshDto } from "./dto/refresh.dto";

/**
 * Login do dono da plataforma — de propósito SEM TenantGuard (a classe
 * AuthController tem `@UseGuards(TenantGuard)` porque toda rota dela é por
 * clínica; aqui não existe clínica nenhuma envolvida, por isso um controller
 * separado em vez de só mais uma rota lá).
 */
@Controller("auth/admin")
export class PlatformAuthController {
  constructor(private readonly auth: AuthService) {}

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post("login")
  login(@Body() dto: LoginDto) {
    return this.auth.loginSuperAdmin(dto.email, dto.password);
  }

  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post("refresh")
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refreshStaffSession(dto.refreshToken);
  }
}
