import { IsInt, Min } from "class-validator";

export class UpdateProcedureMaterialDto {
  @IsInt()
  @Min(1)
  quantityUsed!: number;
}
