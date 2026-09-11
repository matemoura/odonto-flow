import { IsEnum, IsInt, IsISO8601, IsOptional, IsString, Max, Min, MinLength } from "class-validator";
import { TransactionType } from "@odontoflow/db";

export class CreateTransactionDto {
  @IsEnum(TransactionType)
  type!: TransactionType;

  @IsString()
  @MinLength(1)
  category!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsInt()
  @Min(1)
  amountCents!: number;

  @IsISO8601()
  dueDate!: string;

  /**
   * Número de parcelas. `amountCents` é sempre o valor TOTAL — o serviço
   * divide. 1 ou ausente = à vista.
   */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(48)
  installments?: number;

  @IsOptional()
  @IsString()
  professionalId?: string;
}
