import { IsBoolean, IsEnum, IsOptional } from "class-validator";
import { Role } from "@odontoflow/db";

const CARGOS_PERMITIDOS = [Role.CLINIC_ADMIN, Role.DENTIST, Role.ASSISTANT] as const;

export class UpdateTeamMemberRoleDto {
  @IsEnum(CARGOS_PERMITIDOS, { message: "cargo inválido" })
  role!: (typeof CARGOS_PERMITIDOS)[number];

  /** Dá ficha de profissional a quem não é DENTIST (o dono que também atende). */
  @IsOptional()
  @IsBoolean()
  atendePacientes?: boolean;
}
