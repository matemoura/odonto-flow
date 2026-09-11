import { IsISO8601, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export class CreateAppointmentDto {
  @IsString()
  patientId!: string;

  @IsString()
  professionalId!: string;

  @IsISO8601()
  startAt!: string;

  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(240)
  durationMinutes?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
