import { IsInt, IsOptional, IsString, Min } from "class-validator";

export class UpdateInventoryMovementDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @IsOptional()
  @IsString()
  note?: string;
}
