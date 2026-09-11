import { IsString } from "class-validator";

export class SyncProceduresDto {
  @IsString()
  sourceClinicId!: string;
}
