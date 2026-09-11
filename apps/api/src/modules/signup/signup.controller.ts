import { Controller, Get, Post, Body, Query } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { SignupService } from "./signup.service";
import { CreateSignupDto } from "./dto/create-signup.dto";

/**
 * Sem TenantGuard de propósito — ainda não existe clínica nenhuma nesse
 * momento, é isso que esse endpoint cria. Único controle de acesso é o
 * rate limit (evita alguém automatizar criação de clínicas em massa).
 */
@Controller("signup")
export class SignupController {
  constructor(private readonly signup: SignupService) {}

  @Get("disponibilidade")
  checkAvailability(@Query("slug") slug: string) {
    return this.signup.isSlugAvailable(slug);
  }

  @Throttle({ default: { limit: 5, ttl: 60 * 60_000 } })
  @Post()
  create(@Body() dto: CreateSignupDto) {
    return this.signup.create(dto);
  }
}
