import { IsOptional, IsString, MinLength } from "class-validator";

export class CreateOpportunityDto {
  @IsString()
  patientId!: string;

  @IsString()
  @MinLength(2)
  title!: string;

  @IsOptional()
  @IsString()
  budgetId?: string;

  @IsOptional()
  @IsString()
  ownerId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
