import { PartialType } from "@nestjs/mapped-types";
import { IsBoolean, IsOptional } from "class-validator";
import { CreatePatientDto } from "./create-patient.dto";

export class UpdatePatientDto extends PartialType(CreatePatientDto) {
  /**
   * Consentimento LGPD registrado pela recepção.
   *
   * Até aqui `Patient.consentLGPDAt` só era gravado pelo agendamento público,
   * onde o próprio paciente marca a caixa. Quem era cadastrado no balcão ficava
   * sem consentimento — e o login do portal recusa sem ele, mandando "procure a
   * recepção da clínica". A recepção, por sua vez, não tinha botão nenhum: o
   * paciente era mandado de volta para quem não podia resolver.
   *
   * `true` registra a data da PRIMEIRA vez; salvamentos seguintes preservam a
   * original (não fica "reconsentindo" a cada edição). `false` revoga, limpando
   * a data — mesmo padrão do consentimento de tratamento na anamnese.
   */
  @IsOptional()
  @IsBoolean()
  consentLGPD?: boolean;
}
