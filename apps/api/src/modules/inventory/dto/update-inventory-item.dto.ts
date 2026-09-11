import { IsInt, IsOptional, IsString, Min, MinLength } from "class-validator";

export class UpdateInventoryItemDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  unit?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  unitCostCents?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  minQuantity?: number;
}
