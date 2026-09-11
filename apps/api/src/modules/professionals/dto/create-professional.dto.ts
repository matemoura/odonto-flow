import { IsEmail, IsOptional, IsString, MinLength } from "class-validator";

export class CreateProfessionalDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsEmail()
  email!: string;

  /**
   * Sem isso a pessoa nunca conseguia entrar de verdade — o User era criado
   * sem passwordHash e loginStaff exige um pra autenticar. Opcional só
   * quando o e-mail já pertence a um User existente que já tem senha.
   */
  @IsOptional()
  @IsString()
  @MinLength(8, { message: "a senha precisa ter pelo menos 8 caracteres" })
  password?: string;

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
