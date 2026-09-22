import { Body, Controller, Get, Param, Patch, Post, Put, Res, UseGuards } from "@nestjs/common";
import type { Response } from "express";
import archiver from "archiver";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { SuperAdminGuard } from "../../common/guards/super-admin.guard";
import { PlatformAdminService } from "./platform-admin.service";
import { SuspendClinicDto } from "./dto/suspend-clinic.dto";
import { UpdatePlatformSettingsDto } from "./dto/update-platform-settings.dto";

/** Painel do dono da plataforma — cross-tenant de propósito, sem TenantGuard/RolesGuard. */
@Controller("platform-admin")
@UseGuards(JwtAuthGuard, SuperAdminGuard)
export class PlatformAdminController {
  constructor(private readonly platformAdmin: PlatformAdminService) {}

  @Get("clinics")
  listClinics() {
    return this.platformAdmin.listClinics();
  }

  @Get("metrics")
  getMetrics() {
    return this.platformAdmin.getMetrics();
  }

  /**
   * Todo documento (foto, radiografia, contrato) de toda clínica, num .zip
   * em streaming — não passa por interceptor/serializer do Nest de propósito
   * (`@Res()` sem `passthrough`), porque a resposta aqui é bytes de arquivo
   * saindo aos poucos, não um JSON de uma vez só.
   */
  @Get("export/documents")
  async exportDocuments(@Res() res: Response) {
    const nomeArquivo = `odontoflow-documentos-${new Date().toISOString().slice(0, 10)}.zip`;
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${nomeArquivo}"`);

    const archive = archiver("zip", { zlib: { level: 9 } });
    archive.on("error", (error) => {
      // Erro chegando pelo evento do archiver, não por exceção — a resposta
      // já pode ter começado a ser escrita, então só dá pra encerrar a conexão.
      res.destroy(error);
    });
    archive.pipe(res);

    await this.platformAdmin.appendDocumentsToArchive(archive);
    await archive.finalize();
  }

  @Post("clinics/:id/register-payment")
  registerPayment(@Param("id") id: string) {
    return this.platformAdmin.registerPayment(id);
  }

  @Patch("clinics/:id/suspend")
  suspend(@Param("id") id: string, @Body() dto: SuspendClinicDto) {
    return this.platformAdmin.suspend(id, dto);
  }

  @Patch("clinics/:id/reactivate")
  reactivate(@Param("id") id: string) {
    return this.platformAdmin.reactivate(id);
  }

  @Get("settings")
  getSettings() {
    return this.platformAdmin.getSettings();
  }

  @Put("settings")
  updateSettings(@Body() dto: UpdatePlatformSettingsDto) {
    return this.platformAdmin.updateSettings(dto);
  }
}
