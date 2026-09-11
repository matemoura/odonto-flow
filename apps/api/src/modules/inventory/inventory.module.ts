import { Module } from "@nestjs/common";
import { InventoryController } from "./inventory.controller";
import { InventoryService } from "./inventory.service";
import { InventoryReportService } from "./inventory-report.service";

@Module({
  controllers: [InventoryController],
  providers: [InventoryService, InventoryReportService],
  exports: [InventoryService],
})
export class InventoryModule {}
