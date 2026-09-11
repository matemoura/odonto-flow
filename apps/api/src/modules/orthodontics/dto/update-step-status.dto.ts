import { IsEnum } from "class-validator";
import { OrthodonticStepStatus } from "@odontoflow/db";

export class UpdateStepStatusDto {
  @IsEnum(OrthodonticStepStatus)
  status!: OrthodonticStepStatus;
}
