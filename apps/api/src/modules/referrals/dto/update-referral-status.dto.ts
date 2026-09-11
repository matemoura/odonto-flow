import { IsBoolean, IsEnum, IsOptional, IsString } from "class-validator";
import { ReferralStatus } from "@odontoflow/db";

export class UpdateReferralStatusDto {
  @IsEnum(ReferralStatus)
  status!: ReferralStatus;

  /** Ao converter, opcionalmente já linka o paciente novo criado. */
  @IsOptional()
  @IsString()
  referredPatientId?: string;

  @IsOptional()
  @IsBoolean()
  rewardGranted?: boolean;
}
