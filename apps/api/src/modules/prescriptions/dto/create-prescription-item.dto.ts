import { IsOptional, IsString, MinLength, ValidateIf } from "class-validator";

export class CreatePrescriptionItemDto {
  @IsOptional()
  @IsString()
  medicationId?: string;

  /// Obrigatório só quando o item não vem do catálogo (`medicationId` ausente)
  /// — permite adicionar, na hora, um medicamento que não está cadastrado.
  @ValidateIf((dto) => !dto.medicationId)
  @IsString()
  @MinLength(2)
  customName?: string;

  @IsString()
  @MinLength(2)
  posology!: string;

  @IsOptional()
  @IsString()
  instructions?: string;
}
