import { IsInt, IsString, Min } from "class-validator";

export class CreateProcedureMaterialDto {
  @IsString()
  inventoryItemId!: string;

  @IsInt()
  @Min(1)
  quantityUsed!: number;
}
