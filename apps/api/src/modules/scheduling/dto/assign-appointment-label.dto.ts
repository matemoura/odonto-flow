import { IsOptional, IsString } from "class-validator";

export class AssignAppointmentLabelDto {
  /** `null`/omitido = remove o rótulo da consulta. */
  @IsOptional()
  @IsString()
  labelId?: string | null;
}
