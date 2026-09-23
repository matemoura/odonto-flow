import { IsHexColor, IsString, MinLength } from "class-validator";

export class CreateAppointmentLabelDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsHexColor()
  color!: string;
}
