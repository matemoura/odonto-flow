import { IsIn, IsInt, IsOptional, IsString, Min } from "class-validator";

const DIRECTIONS = ["IN", "OUT"] as const;

export class AdjustInventoryItemDto {
  @IsIn(DIRECTIONS)
  direction!: (typeof DIRECTIONS)[number];

  @IsInt()
  @Min(1)
  quantity!: number;

  @IsOptional()
  @IsString()
  note?: string;
}
