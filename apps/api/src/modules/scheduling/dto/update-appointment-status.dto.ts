import { IsIn } from "class-validator";
import { AppointmentStatus } from "@odontoflow/db";

const STATUSES: AppointmentStatus[] = [
  "SCHEDULED",
  "CONFIRMED",
  "WAITING",
  "FILLING_FORM",
  "CANCELLED",
  "COMPLETED",
  "NO_SHOW",
];

export class UpdateAppointmentStatusDto {
  @IsIn(STATUSES)
  status!: AppointmentStatus;
}
