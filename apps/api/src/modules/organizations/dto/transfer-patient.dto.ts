import { IsString } from "class-validator";

export class TransferPatientDto {
  @IsString()
  patientId!: string;

  @IsString()
  toClinicId!: string;
}
