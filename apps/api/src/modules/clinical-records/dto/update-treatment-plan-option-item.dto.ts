import { IsInt, IsOptional, Min } from "class-validator";

export class UpdateTreatmentPlanOptionItemDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  unitPriceCents?: number;
}
