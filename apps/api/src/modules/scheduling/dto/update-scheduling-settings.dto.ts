import { ArrayMaxSize, ArrayMinSize, ArrayUnique, IsArray, IsInt, Max, Min } from "class-validator";

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
}
