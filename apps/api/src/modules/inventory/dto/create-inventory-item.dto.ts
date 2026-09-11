import { IsInt, IsOptional, IsString, Min, MinLength } from "class-validator";

export class CreateInventoryItemDto {
  @IsString()
  @MinLength(2)
  name!: string;

  /** Unidade de medida em texto livre — "un", "ml", "g", "caixa", etc. */
  @IsString()
  @MinLength(1)
  unit!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  unitCostCents?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  quantityOnHand?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  minQuantity?: number;
}
