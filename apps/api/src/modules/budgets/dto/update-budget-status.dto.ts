import { IsIn } from "class-validator";
import { BudgetStatus } from "@odontoflow/db";

const STATUSES: BudgetStatus[] = ["PENDING", "APPROVED", "DECLINED", "EXPIRED"];

export class UpdateBudgetStatusDto {
  @IsIn(STATUSES)
  status!: BudgetStatus;
}
