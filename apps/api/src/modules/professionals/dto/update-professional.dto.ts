import { PartialType, OmitType } from "@nestjs/mapped-types";
import { CreateProfessionalDto } from "./create-professional.dto";

export class UpdateProfessionalDto extends PartialType(OmitType(CreateProfessionalDto, ["email"] as const)) {}
