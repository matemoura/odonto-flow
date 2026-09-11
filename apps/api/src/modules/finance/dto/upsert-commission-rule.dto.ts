import { IsInt, Max, Min } from "class-validator";

export class UpsertCommissionRuleDto {
  /** Percentual em pontos-base — 3000 = 30,00%. */
  @IsInt()
  @Min(0)
  @Max(10000)
  percentageBasisPoints!: number;
}
