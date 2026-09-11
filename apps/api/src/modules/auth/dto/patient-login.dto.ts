import { IsEmail } from "class-validator";

/**
 * Login "mock" do portal do paciente: só e-mail, sem senha nem OTP real.
 * Plugar magic-link/OTP por WhatsApp de verdade é trabalho de Fase 4
 * (ver packages/integrations/whatsapp) — isso aqui é só para destravar o
 * desenvolvimento do portal antes de contratar um provedor.
 */
export class PatientLoginDto {
  @IsEmail()
  email!: string;
}
