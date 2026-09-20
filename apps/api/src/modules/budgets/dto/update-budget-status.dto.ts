import { IsIn, IsISO8601, IsInt, IsOptional, Max, Min } from "class-validator";
import { BudgetStatus } from "@odontoflow/db";

const STATUSES: BudgetStatus[] = ["PENDING", "APPROVED", "DECLINED", "EXPIRED"];

export class UpdateBudgetStatusDto {
  @IsIn(STATUSES)
  status!: BudgetStatus;

  /**
   * Condição de pagamento combinada na hora de aprovar. Só é lida quando o
   * status vira `APPROVED`, e só na PRIMEIRA aprovação — reaprovar um
   * orçamento não gera as parcelas de novo.
   *
   * Aprovar passou a lançar o contas a receber porque antes não lançava nada:
   * a clínica aprovava R$ 5.000 em 10x e tinha que redigitar tudo à mão no
   * financeiro, sem vínculo com o orçamento, sem proteção contra lançar duas
   * vezes e sem proteção contra esquecer.
   */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(24)
  installments?: number;

  /** "YYYY-MM-DD", no fuso da clínica. Sem valor, vence hoje. */
  @IsOptional()
  @IsISO8601({ strict: true })
  firstDueDate?: string;
}
