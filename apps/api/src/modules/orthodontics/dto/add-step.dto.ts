import { IsDateString, IsOptional, IsString, MinLength } from "class-validator";

export class AddStepDto {
  @IsString()
  @MinLength(1)
  description!: string;

  @IsOptional()
  @IsDateString()
  scheduledFor?: string;
}
