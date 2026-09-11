import { IsBoolean, IsEmail, IsEnum, IsOptional, IsString, MinLength } from "class-validator";
import { Role } from "@odontoflow/db";

const CARGOS_PERMITIDOS = [Role.CLINIC_ADMIN, Role.DENTIST, Role.ASSISTANT] as const;

export class CreateTeamMemberDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsEmail()
  email!: string;

  /** Obrigatório quando o e-mail ainda não pertence a nenhum User (ver TeamService.create). */
  @IsOptional()
  @IsString()
  @MinLength(8, { message: "a senha precisa ter pelo menos 8 caracteres" })
  password?: string;

  @IsEnum(CARGOS_PERMITIDOS, { message: "cargo inválido" })
  role!: (typeof CARGOS_PERMITIDOS)[number];

  /**
   * Marca que a pessoa também atende paciente, mesmo não sendo DENTIST — é o
   * caso do dono da clínica que administra e atende. Dentista não precisa
   * disso (já atende por definição).
   */
  @IsOptional()
  @IsBoolean()
  atendePacientes?: boolean;

  // Campos clínicos — usados quando a pessoa atende (DENTIST ou atendePacientes).
  @IsOptional()
  @IsString()
  croNumber?: string;

  @IsOptional()
  @IsString()
  specialty?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  bio?: string;
}
