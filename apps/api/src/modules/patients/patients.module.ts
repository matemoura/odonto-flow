import { Module } from "@nestjs/common";
import { IntegrationsModule } from "../integrations/integrations.module";
import { PatientsController } from "./patients.controller";
import { PatientsService } from "./patients.service";
import { CreditScoreService } from "./credit-score.service";

@Module({
  imports: [IntegrationsModule],
  controllers: [PatientsController],
  providers: [PatientsService, CreditScoreService],
  exports: [PatientsService],
})
export class PatientsModule {}
