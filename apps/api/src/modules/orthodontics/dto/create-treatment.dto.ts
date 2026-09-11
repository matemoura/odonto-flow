import { IsArray, IsDateString, IsEnum, IsOptional, IsString, MinLength, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { OrthodonticApplianceType } from "@odontoflow/db";

class InitialStepDto {
  @IsString()
  @MinLength(1)
  description!: string;

  @IsOptional()
  @IsDateString()
  scheduledFor?: string;
}

export class CreateTreatmentDto {
  @IsString()
  patientId!: string;

  @IsString()
  professionalId!: string;

  @IsEnum(OrthodonticApplianceType)
  applianceType!: OrthodonticApplianceType;

  @IsDateString()
  startedAt!: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InitialStepDto)
  steps?: InitialStepDto[];
}
