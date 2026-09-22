import { Injectable, NotFoundException } from "@nestjs/common";
import { DocumentType } from "@odontoflow/db";
import { PrismaService } from "../../database/prisma.service";
import { assertPacienteDaClinica } from "../../common/scope/tenant-scope.util";

/** Nunca inclui `content` — listar não precisa carregar o binário inteiro de cada arquivo. */
const METADATA_SELECT = {
  id: true,
  type: true,
  fileName: true,
  mimeType: true,
  sizeBytes: true,
  createdAt: true,
} as const;

@Injectable()
export class DocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  listForPatient(clinicId: string, patientId: string) {
    return this.prisma.document.findMany({
      where: { clinicId, patientId },
      select: METADATA_SELECT,
      orderBy: { createdAt: "desc" },
    });
  }

  async create(
    clinicId: string,
    patientId: string,
    type: DocumentType,
    file: Express.Multer.File,
  ) {
    // Sem esta checagem, o registro no banco apontaria o documento para
    // paciente de outra clínica — e a ficha dele passaria a exibir um
    // arquivo alheio.
    await assertPacienteDaClinica(this.prisma, clinicId, patientId);
    return this.prisma.document.create({
      data: {
        clinicId,
        patientId,
        type,
        fileName: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        // `Uint8Array(buffer)` em vez de `file.buffer` direto: o `Buffer` do
        // Node é tipado como `Uint8Array<ArrayBufferLike>`, mais largo do que
        // o `Uint8Array<ArrayBuffer>` que o Prisma exige pra `Bytes` — só um
        // atrito de tipos, os bytes são os mesmos.
        content: new Uint8Array(file.buffer),
      },
      select: METADATA_SELECT,
    });
  }

  async getFileForDownload(clinicId: string, id: string) {
    const document = await this.prisma.document.findFirst({
      where: { id, clinicId },
      select: { fileName: true, mimeType: true, content: true },
    });
    if (!document) {
      throw new NotFoundException("Documento não encontrado.");
    }
    return document;
  }
}
