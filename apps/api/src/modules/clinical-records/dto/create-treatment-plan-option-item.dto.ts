import { IsInt, IsOptional, IsString, Min } from "class-validator";

export class CreateTreatmentPlanOptionItemDto {
  @IsString()
  procedureId!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  unitPriceCents?: number;
}
