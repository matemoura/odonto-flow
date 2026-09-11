import { Module } from "@nestjs/common";
import { IntegrationsModule } from "../integrations/integrations.module";
import { FinanceController } from "./finance.controller";
import { FinanceService } from "./finance.service";
import { FinanceReportService } from "./finance-report.service";
import { InvoicesService } from "./invoices.service";

@Module({
  imports: [IntegrationsModule],
  controllers: [FinanceController],
  providers: [FinanceService, FinanceReportService, InvoicesService],
})
export class FinanceModule {}
