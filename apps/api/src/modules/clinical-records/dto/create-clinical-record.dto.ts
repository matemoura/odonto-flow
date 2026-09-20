import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from "class-validator";
import { ClinicalRecordType } from "@odontoflow/db";

/** Base64 PNG desenhado no canvas — 400_000 chars cobre uma assinatura simples com folga. */
const TAMANHO_MAXIMO_ASSINATURA = 400_000;

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

  @IsOptional()
  @IsString()
  @MaxLength(TAMANHO_MAXIMO_ASSINATURA)
  professionalSignature?: string;

  @IsOptional()
  @IsString()
  @MaxLength(TAMANHO_MAXIMO_ASSINATURA)
  patientSignature?: string;
}
