import { IsBoolean, IsInt, IsOptional, IsString, Min, MinLength } from "class-validator";

export class CreateTreatmentPlanOptionDto {
  @IsString()
  patientId!: string;

  @IsOptional()
  @IsString()
  professionalId?: string;

  @IsString()
  @MinLength(1)
  label!: string;

  @IsString()
  @MinLength(1)
  description!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  estimatedCostCents?: number;

  @IsOptional()
  @IsBoolean()
  recommended?: boolean;
}
