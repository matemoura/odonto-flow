import { Module } from "@nestjs/common";
import { MedicationsController } from "./medications.controller";
import { PrescriptionsController } from "./prescriptions.controller";
import { PrescriptionsService } from "./prescriptions.service";

@Module({
  controllers: [MedicationsController, PrescriptionsController],
  providers: [PrescriptionsService],
})
export class PrescriptionsModule {}
