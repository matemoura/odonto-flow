import { IsBoolean, IsOptional, IsString, MinLength } from "class-validator";

export class UpdateIntegrationConfigDto {
  @IsString()
  @MinLength(2)
  providerName!: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
