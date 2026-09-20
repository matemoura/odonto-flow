import { Transform } from "class-transformer";
import { IsOptional, IsString, Matches, ValidateIf } from "class-validator";

/**
 * O pedaço das integrações que é da clínica. Provedor e liberação NÃO entram
 * aqui de propósito: mesmo que alguém mande esses campos, o `whitelist` do
 * ValidationPipe os descarta antes de chegar ao serviço.
 */
export class UpdateClinicIntegrationSettingsDto {
  /**
   * Número de WhatsApp da clínica, guardado em E.164 (+5511987654321).
   *
   * O `@Transform` limpa a máscara que a pessoa digita — "(11) 98765-4321" e
   * "+55 11 98765-4321" chegam iguais ao banco. Recusar o formato que todo
   * brasileiro escreve seria exigir que o usuário conhecesse a E.164.
   */
  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.replace(/[^\d+]/g, "") : value))
  @ValidateIf((_, value) => value !== "" && value !== null)
  @IsString()
  @Matches(/^\+[1-9]\d{7,14}$/, {
    message: "Informe o WhatsApp com código do país, como +5511987654321.",
  })
  whatsappPhone?: string | null;
}
