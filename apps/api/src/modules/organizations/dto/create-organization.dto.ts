import { IsString, Matches, MinLength } from "class-validator";

export class CreateOrganizationDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsString()
  @Matches(/^[a-z0-9]+(-[a-z0-9]+)*$/, { message: "slug deve conter apenas letras minúsculas, números e hífens" })
  slug!: string;
}
