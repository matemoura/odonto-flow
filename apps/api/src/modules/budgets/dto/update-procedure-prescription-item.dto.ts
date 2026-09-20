import { IsInt, IsOptional, IsString, Min, MinLength } from "class-validator";

export class UpdateProcedurePrescriptionItemDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  customName?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  posology?: string;

  @IsOptional()
  @IsString()
  instructions?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}
