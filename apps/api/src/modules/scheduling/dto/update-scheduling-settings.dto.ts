import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsInt,
  Max,
  Min,
  Validate,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from "class-validator";

/**
 * Coerência do expediente.
 *
 * É uma checagem só, e não quatro `@Min` separados, porque a regra é sobre a
 * RELAÇÃO entre os campos: "a tarde começa depois da manhã" não existe num
 * campo isolado. Sem ela, salvar manhã 12:00–08:00 passaria e a agenda ficaria
 * vazia sem nenhum erro aparecer em lugar nenhum.
 *
 * **Turno desligado é janela de tamanho zero** (`início === fim`). Clínica que
 * só atende de manhã, ou só à tarde, é caso real e precisa caber no modelo —
 * antes a validação exigia os dois turnos e não havia como representá-la.
 * Zerar a janela em vez de aceitar nulo mantém as colunas `Int` não-nulas e faz
 * `getWorkingSlots` simplesmente não gerar horário para aquele período, sem
 * ramo novo no cálculo.
 */
@ValidatorConstraint({ name: "expedienteCoerente", async: false })
class ExpedienteCoerente implements ValidatorConstraintInterface {
  validate(_valor: unknown, args: ValidationArguments) {
    const dto = args.object as UpdateSchedulingSettingsDto;
    const { morningStartMinutes: ms, morningEndMinutes: me } = dto;
    const { afternoonStartMinutes: ts, afternoonEndMinutes: te } = dto;
    const duracao = dto.slotDurationMinutes;

    if ([ms, me, ts, te, duracao].some((v) => typeof v !== "number")) return false;

    // Ordem e não-sobreposição. `<=` em toda parte porque cada janela pode
    // estar zerada, e a tarde pode colar na manhã (expediente sem almoço).
    if (!(ms <= me && me <= ts && ts <= te)) return false;

    const manha = me - ms;
    const tarde = te - ts;

    // Janela que existe mas não comporta um encaixe é engano, não turno
    // desligado: 08:00–08:10 com consulta de 40min não geraria horário nenhum
    // e ninguém entenderia por quê.
    if (manha > 0 && manha < duracao) return false;
    if (tarde > 0 && tarde < duracao) return false;

    // Pelo menos um turno de pé — sem isso a clínica abre e não atende ninguém.
    return manha >= duracao || tarde >= duracao;
  }

  defaultMessage() {
    return (
      "Confira o expediente: a tarde precisa começar depois da manhã, cada turno usado tem que " +
      "comportar ao menos uma consulta, e ao menos um turno precisa estar ativo."
    );
  }
}

export class UpdateSchedulingSettingsDto {
  /**
   * Dias em que a clínica atende, no padrão de `Date#getDay()`: 0 = domingo …
   * 6 = sábado.
   *
   * `ArrayMinSize(1)` é regra de negócio, não formalidade: clínica sem nenhum
   * dia de atendimento tem agenda vazia para sempre e link público que não
   * oferece nada — sem erro em lugar nenhum, o que é pior do que recusar aqui.
   */
  @IsArray()
  @ArrayMinSize(1, { message: "Escolha ao menos um dia de atendimento." })
  @ArrayMaxSize(7)
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  workingWeekdays!: number[];

  /* Expediente em minutos desde a meia-noite. 0 = 00:00, 1439 = 23:59. */

  @IsInt()
  @Min(0)
  @Max(1439)
  morningStartMinutes!: number;

  @IsInt()
  @Min(0)
  @Max(1439)
  morningEndMinutes!: number;

  @IsInt()
  @Min(0)
  @Max(1439)
  afternoonStartMinutes!: number;

  @IsInt()
  @Min(0)
  @Max(1439)
  afternoonEndMinutes!: number;

  /** Teto de 8h por encaixe; piso de 5min para não gerar uma grade absurda. */
  @IsInt()
  @Min(5)
  @Max(480)
  @Validate(ExpedienteCoerente)
  slotDurationMinutes!: number;
}
