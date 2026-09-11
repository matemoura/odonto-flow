import { Module } from "@nestjs/common";
import { FaceogramController } from "./faceogram.controller";
import { FaceogramService } from "./faceogram.service";

@Module({
  controllers: [FaceogramController],
  providers: [FaceogramService],
})
export class FaceogramModule {}
