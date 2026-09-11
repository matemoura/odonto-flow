import { IsInt, Min } from "class-validator";

export class UpdatePlatformSettingsDto {
  @IsInt()
  @Min(0)
  delinquencyGracePeriodDays!: number;
}
