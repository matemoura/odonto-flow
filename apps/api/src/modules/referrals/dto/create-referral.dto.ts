import { IsOptional, IsString, MinLength } from "class-validator";

export class CreateReferralDto {
  @IsString()
  referrerPatientId!: string;

  @IsString()
  @MinLength(2)
  referredName!: string;

  @IsOptional()
  @IsString()
  referredPhone?: string;
}
