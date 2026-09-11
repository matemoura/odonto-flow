import { Module } from "@nestjs/common";
import { IntegrationsModule } from "../integrations/integrations.module";
import { InventoryModule } from "../inventory/inventory.module";
import { BudgetsController } from "./budgets.controller";
import { BudgetsService } from "./budgets.service";
import { ContractsService } from "./contracts.service";
import { ProceduresController } from "./procedures.controller";
import { ProceduresService } from "./procedures.service";

@Module({
  imports: [IntegrationsModule, InventoryModule],
  controllers: [BudgetsController, ProceduresController],
  providers: [BudgetsService, ProceduresService, ContractsService],
})
export class BudgetsModule {}
