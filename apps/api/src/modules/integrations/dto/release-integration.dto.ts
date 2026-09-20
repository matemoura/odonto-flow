import { IsBoolean, IsOptional, IsString, MinLength } from "class-validator";

/**
 * Liberar (ou fechar) uma integração para uma clínica. Só o dono da plataforma
 * manda isto — é ele quem contrata o provedor real e quem paga por ele.
 */
export class ReleaseIntegrationDto {
  @IsBoolean()
  enabled!: boolean;

  /**
   * Opcional porque fechar uma integração não exige repetir o provedor. Sem
   * valor, e sem linha ainda, a integração nasce em "mock" — o modo grátis.
   */
  @IsOptional()
  @IsString()
  @MinLength(2)
  providerName?: string;
}
