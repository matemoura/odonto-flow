import { IsEnum } from "class-validator";
import { OrthodonticTreatmentStatus } from "@odontoflow/db";

export class UpdateTreatmentStatusDto {
  @IsEnum(OrthodonticTreatmentStatus)
  status!: OrthodonticTreatmentStatus;
}
