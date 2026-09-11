import { Equals, IsEmail, IsISO8601, IsOptional, IsString, Matches, MinLength } from "class-validator";

export class CreatePublicAppointmentDto {
  @IsString()
  professionalId!: string;

  /** Data no formato YYYY-MM-DD (fuso da clínica). */
  @IsISO8601({ strict: true })
  date!: string;

  /** Horário no formato HH:mm, deve bater com um slot livre retornado por /public/availability. */
  @Matches(/^([01]\d|2[0-3]):(00|40|20)$/, { message: "Horário inválido." })
  time!: string;

  @IsString()
  @MinLength(2)
  patientName!: string;

  @IsString()
  @Matches(/^\+?[0-9() .-]{8,20}$/, { message: "Telefone inválido." })
  patientPhone!: string;

  @IsOptional()
  @IsEmail()
  patientEmail?: string;

  @IsOptional()
  @IsString()
  patientCpf?: string;

  /** Precisa vir explicitamente true — é o registro de consentimento LGPD (Patient.consentLGPDAt). */
  @Equals(true, { message: "É necessário aceitar o consentimento para agendar." })
  consentLGPD!: boolean;
}
