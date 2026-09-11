import { IsOptional, IsString } from "class-validator";

export class SuspendClinicDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
