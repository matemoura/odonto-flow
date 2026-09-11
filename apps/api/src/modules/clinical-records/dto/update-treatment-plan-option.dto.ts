import { PartialType, OmitType } from "@nestjs/mapped-types";
import { CreateTreatmentPlanOptionDto } from "./create-treatment-plan-option.dto";

export class UpdateTreatmentPlanOptionDto extends PartialType(
  OmitType(CreateTreatmentPlanOptionDto, ["patientId"] as const),
) {}
