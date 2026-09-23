import { PartialType } from "@nestjs/mapped-types";
import { CreateAppointmentLabelDto } from "./create-appointment-label.dto";

export class UpdateAppointmentLabelDto extends PartialType(CreateAppointmentLabelDto) {}
