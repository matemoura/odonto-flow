import { IsObject, IsOptional, IsString, MinLength } from "class-validator";

/**
 * Conectar (ou reconfigurar) o provedor real de uma integração, na conta da
 * plataforma inteira — não de uma clínica. `secret` é opcional porque
 * reconfigurar só o `config` (ex.: trocar o phoneNumberId) não deveria exigir
 * repetir a chave já salva.
 */
export class UpsertPlatformIntegrationCredentialDto {
  @IsString()
  @MinLength(2)
  providerName!: string;

  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @MinLength(1)
  secret?: string;
}
