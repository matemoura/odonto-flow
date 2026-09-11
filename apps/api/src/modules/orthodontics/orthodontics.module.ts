import { Module } from "@nestjs/common";
import { OrthodonticsController } from "./orthodontics.controller";
import { OrthodonticsService } from "./orthodontics.service";

@Module({
  controllers: [OrthodonticsController],
  providers: [OrthodonticsService],
})
export class OrthodonticsModule {}
