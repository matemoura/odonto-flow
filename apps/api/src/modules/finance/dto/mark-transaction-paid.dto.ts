import { IsEnum } from "class-validator";
import { PaymentMethod } from "@odontoflow/db";

export class MarkTransactionPaidDto {
  @IsEnum(PaymentMethod)
  paymentMethod!: PaymentMethod;
}
