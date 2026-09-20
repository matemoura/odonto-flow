import { Injectable, NotFoundException } from "@nestjs/common";
import { join } from "node:path";
import { DocumentType } from "@odontoflow/db";
import { PrismaService } from "../../database/prisma.service";
import { assertPacienteDaClinica } from "../../common/scope/tenant-scope.util";
import { UPLOADS_ROOT } from "./uploads.config";

@Injectable()
export class DocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  listForPatient(clinicId: string, patientId: string) {
    return this.prisma.document.findMany({
      where: { clinicId, patientId },
      orderBy: { createdAt: "desc" },
    });
  }

  async create(
    clinicId: string,
    patientId: string,
    type: DocumentType,
    file: Express.Multer.File,
  ) {
    // O arquivo já foi gravado em disco quando chegamos aqui (o multer roda
    // antes do handler), mas dentro da pasta da clínica da SESSÃO. Sem esta
    // checagem, o registro no banco apontaria o documento para paciente de
    // outra clínica — e a ficha dele passaria a exibir um arquivo alheio.
    await assertPacienteDaClinica(this.prisma, clinicId, patientId);
    return this.prisma.document.create({
      data: {
        clinicId,
        patientId,
        type,
        storageKey: file.filename,
        fileName: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
      },
    });
  }

  async getFileForDownload(clinicId: string, id: string) {
    const document = await this.prisma.document.findFirst({ where: { id, clinicId } });
    if (!document) {
      throw new NotFoundException("Documento não encontrado.");
    }
    return { document, path: join(UPLOADS_ROOT, clinicId, document.storageKey) };
  }
}
