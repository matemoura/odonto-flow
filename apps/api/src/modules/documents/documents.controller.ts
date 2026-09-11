import { createReadStream } from "node:fs";
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { Role } from "@odontoflow/db";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { TenantGuard } from "../../common/guards/tenant.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentTenant } from "../../common/decorators/current-tenant.decorator";
import { AuditEntity, AuditLogInterceptor } from "../../common/interceptors/audit-log.interceptor";
import { DocumentsService } from "./documents.service";
import { UploadDocumentDto } from "./dto/upload-document.dto";
import { documentFileFilter, documentStorage } from "./uploads.config";

@Controller("documents")
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Roles(Role.CLINIC_ADMIN, Role.DENTIST, Role.ASSISTANT, Role.ORG_ADMIN)
@UseInterceptors(AuditLogInterceptor)
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @Get()
  @AuditEntity("Document")
  list(@CurrentTenant() clinicId: string, @Query("patientId") patientId: string) {
    return this.documents.listForPatient(clinicId, patientId);
  }

  @Post()
  @AuditEntity("Document")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: documentStorage(),
      fileFilter: documentFileFilter,
      limits: { fileSize: 15 * 1024 * 1024 },
    }),
  )
  upload(
    @CurrentTenant() clinicId: string,
    @Body() dto: UploadDocumentDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.documents.create(clinicId, dto.patientId, dto.type, file);
  }

  @Get(":id/download")
  @AuditEntity("Document")
  async download(@CurrentTenant() clinicId: string, @Param("id") id: string) {
    const { document, path } = await this.documents.getFileForDownload(clinicId, id);
    return new StreamableFile(createReadStream(path), {
      type: document.mimeType,
      disposition: `attachment; filename="${document.fileName}"`,
    });
  }
}
