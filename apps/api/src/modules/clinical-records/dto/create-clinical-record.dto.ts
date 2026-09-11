import { IsEnum, IsOptional, IsString, MinLength } from "class-validator";
import { ClinicalRecordType } from "@odontoflow/db";

export class CreateClinicalRecordDto {
  @IsString()
  patientId!: string;

  @IsOptional()
  @IsString()
  appointmentId?: string;

  @IsEnum(ClinicalRecordType)
  type!: ClinicalRecordType;

  @IsString()
  @MinLength(1)
  content!: string;
}
