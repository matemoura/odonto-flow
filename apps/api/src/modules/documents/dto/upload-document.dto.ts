import { IsEnum, IsString } from "class-validator";
import { DocumentType } from "@odontoflow/db";

export class UploadDocumentDto {
  @IsString()
  patientId!: string;

  @IsEnum(DocumentType)
  type!: DocumentType;
}
