import { IsBoolean, IsInt, IsOptional, IsString, Min } from "class-validator";

export class UpsertAnamnesisDto {
  @IsString()
  patientId!: string;

  @IsOptional()
  @IsString()
  chiefComplaint?: string;

  @IsOptional()
  @IsString()
  expectedOutcome?: string;

  @IsOptional()
  @IsBoolean()
  hasHypertension?: boolean;

  @IsOptional()
  @IsBoolean()
  hasDiabetes?: boolean;

  @IsOptional()
  @IsBoolean()
  hasHeartCondition?: boolean;

  @IsOptional()
  @IsBoolean()
  hasBleedingDisorder?: boolean;

  @IsOptional()
  @IsBoolean()
  isPregnant?: boolean;

  @IsOptional()
  @IsBoolean()
  isSmoker?: boolean;

  @IsOptional()
  @IsBoolean()
  hasChronicKidneyDisease?: boolean;

  @IsOptional()
  @IsBoolean()
  hasCancerOrImmunosuppression?: boolean;

  @IsOptional()
  @IsBoolean()
  hasAllergies?: boolean;

  @IsOptional()
  @IsString()
  allergyDetails?: string;

  @IsOptional()
  @IsString()
  currentMedications?: string;

  @IsOptional()
  @IsString()
  previousSurgeries?: string;

  @IsOptional()
  @IsString()
  otherHealthNotes?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  brushingFrequencyPerDay?: number;

  @IsOptional()
  @IsBoolean()
  flossesRegularly?: boolean;

  @IsOptional()
  @IsBoolean()
  usesMouthwash?: boolean;

  @IsOptional()
  @IsBoolean()
  hasBruxism?: boolean;

  @IsOptional()
  @IsString()
  oralHygieneNotes?: string;

  @IsOptional()
  @IsBoolean()
  treatmentConsent?: boolean;

  @IsOptional()
  @IsBoolean()
  imageUseConsent?: boolean;

  /// PNG em data URL, desenhada na hora — mesmo formato do
  /// ClinicalRecord.professionalSignature/patientSignature.
  @IsOptional()
  @IsString()
  consentSignature?: string;
}
