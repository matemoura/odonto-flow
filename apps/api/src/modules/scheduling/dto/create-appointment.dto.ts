import { IsISO8601, IsInt, IsOptional, IsString, Matches, Max, Min } from "class-validator";

export class CreateAppointmentDto {
  @IsString()
  patientId!: string;

  @IsString()
  professionalId!: string;

  /**
   * Data e hora SEPARADAS, no fuso da clínica — o mesmo formato que o
   * agendamento público já usava.
   *
   * Antes esta rota recebia um `startAt` ISO pronto, montado no navegador com
   * `new Date(\`${date}T${time}\`)`: uma string sem sufixo de fuso, interpretada
   * no fuso da MÁQUINA de quem preenche. Recepcionista trabalhando de casa em
   * outro fuso, ou clínica em Manaus administrada de São Paulo, marcava
   * consulta com uma hora de diferença — e a API confiava, porque o instante
   * chegava já resolvido. Mandando data e hora cruas, quem resolve é o
   * servidor, com o `Clinic.timezone`.
   */
  @IsISO8601({ strict: true })
  date!: string;

  /** "HH:mm". Aqui, ao contrário do público, qualquer horário vale — a recepção encaixa fora da grade. */
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: "Horário inválido." })
  time!: string;

  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(240)
  durationMinutes?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
