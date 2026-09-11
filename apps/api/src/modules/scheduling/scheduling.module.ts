import { Module } from "@nestjs/common";
import { ProfessionalsModule } from "../professionals/professionals.module";
import { IntegrationsModule } from "../integrations/integrations.module";
import { SchedulingController } from "./scheduling.controller";
import { SchedulingPublicController } from "./scheduling-public.controller";
import { SchedulingService } from "./scheduling.service";

@Module({
  imports: [ProfessionalsModule, IntegrationsModule],
  controllers: [SchedulingController, SchedulingPublicController],
  providers: [SchedulingService],
})
export class SchedulingModule {}
