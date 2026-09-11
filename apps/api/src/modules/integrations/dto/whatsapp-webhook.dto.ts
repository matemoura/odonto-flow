import { IsString, Matches, MinLength } from "class-validator";

export class WhatsAppWebhookDto {
  @IsString()
  @Matches(/^\+?[0-9() .-]{8,20}$/, { message: "Telefone inválido." })
  fromPhoneE164!: string;

  @IsString()
  @MinLength(1)
  text!: string;
}
