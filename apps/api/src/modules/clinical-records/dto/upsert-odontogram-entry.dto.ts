import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from "class-validator";
import { ToothCondition } from "@odontoflow/db";

export class UpsertOdontogramEntryDto {
  @IsString()
  patientId!: string;

  @IsInt()
  @Min(11)
  @Max(85)
  toothNumber!: number;

  @IsEnum(ToothCondition)
  condition!: ToothCondition;

  @IsOptional()
  @IsString()
  faces?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
