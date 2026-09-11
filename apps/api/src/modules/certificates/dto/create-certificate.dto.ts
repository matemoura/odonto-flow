import { IsIn, IsInt, IsOptional, IsString, Min, MinLength } from "class-validator";
import { CertificateType, CertificateBeneficiary } from "@odontoflow/db";

const TYPES: CertificateType[] = ["ATTENDANCE", "MEDICAL"];
const BENEFICIARIES: CertificateBeneficiary[] = ["PATIENT", "COMPANION"];

export class CreateCertificateDto {
  @IsString()
  patientId!: string;

  @IsString()
  professionalId!: string;

  @IsIn(TYPES)
  type!: CertificateType;

  @IsOptional()
  @IsIn(BENEFICIARIES)
  beneficiary?: CertificateBeneficiary;

  @IsOptional()
  @IsString()
  @MinLength(2)
  companionName?: string;

  @IsString()
  visitDate!: string;

  @IsOptional()
  @IsString()
  arrivalTime?: string;

  @IsOptional()
  @IsString()
  departureTime?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  daysOff?: number;

  @IsOptional()
  @IsString()
  cidCode?: string;
}
