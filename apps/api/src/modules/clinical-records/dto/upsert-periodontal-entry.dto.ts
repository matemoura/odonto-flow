import { IsBoolean, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export class UpsertPeriodontalEntryDto {
  @IsString()
  patientId!: string;

  @IsInt()
  @Min(11)
  @Max(48)
  toothNumber!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  probingDepthBuccalMesial?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  probingDepthBuccalCentral?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  probingDepthBuccalDistal?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  probingDepthLingualMesial?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  probingDepthLingualCentral?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  probingDepthLingualDistal?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(3)
  mobility?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  recession?: number;

  @IsOptional()
  @IsBoolean()
  bleeding?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}
