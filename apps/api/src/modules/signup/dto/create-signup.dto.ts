import { IsEmail, IsIn, IsOptional, IsString, Matches, MinLength } from "class-validator";

export class CreateSignupDto {
  @IsString()
  @MinLength(2)
  clinicName!: string;

  @IsString()
  @Matches(/^[a-z0-9]+(-[a-z0-9]+)*$/, {
    message: "o link da clínica deve ter só letras minúsculas, números e hífens",
  })
  clinicSlug!: string;

  @IsString()
  @MinLength(2)
  adminName!: string;

  @IsEmail()
  adminEmail!: string;

  @IsString()
  @MinLength(8, { message: "a senha precisa ter pelo menos 8 caracteres" })
  adminPassword!: string;

  @IsOptional()
  @IsIn(["basic", "plus", "pro"])
  plan?: string;
}
