import { IsString } from "class-validator";

export class JoinOrganizationDto {
  @IsString()
  organizationId!: string;
}
