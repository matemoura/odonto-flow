import { IsInt, Max, Min } from "class-validator";

export class UpdateCardSettingsDto {
  /** Pontos-base: 300 = 3,00%. Mesma unidade de CommissionRule. */
  @IsInt()
  @Min(0)
  @Max(3000)
  cardFeeBasisPoints!: number;

  /** Dias até o dinheiro do cartão cair na conta. */
  @IsInt()
  @Min(0)
  @Max(180)
  cardSettlementDays!: number;
}
