import { IsEnum, IsOptional, IsString } from "class-validator";
import { OpportunityStage } from "@odontoflow/db";

export class UpdateOpportunityDto {
  @IsOptional()
  @IsEnum(OpportunityStage)
  stage?: OpportunityStage;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  ownerId?: string;
}
