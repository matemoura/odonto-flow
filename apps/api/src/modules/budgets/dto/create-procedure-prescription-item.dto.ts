import { IsInt, IsOptional, IsString, Min, MinLength, ValidateIf } from "class-validator";

export class CreateProcedurePrescriptionItemDto {
  @IsOptional()
  @IsString()
  medicationId?: string;

  /// Obrigatório só quando o item não vem do catálogo (`medicationId` ausente).
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

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}
