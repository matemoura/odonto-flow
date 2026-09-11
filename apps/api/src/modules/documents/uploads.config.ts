import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { diskStorage } from "multer";
import { randomUUID } from "node:crypto";

/**
 * Documento clínico só faz sentido como imagem (radiografia/foto) ou PDF
 * (contrato/laudo digitalizado) — sem isso, o upload aceitava qualquer
 * arquivo (executável, HTML, etc.) até o limite de 15MB.
 */
const TIPOS_PERMITIDOS = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);

export function documentFileFilter(
  _req: unknown,
  file: Express.Multer.File,
  callback: (error: Error | null, acceptFile: boolean) => void,
) {
  if (!TIPOS_PERMITIDOS.has(file.mimetype)) {
    callback(new Error("Arquivo precisa ser imagem (JPG/PNG/WEBP) ou PDF."), false);
    return;
  }
  callback(null, true);
}

/**
 * Armazenamento local em disco — suficiente para dev/demo. Trocar por
 * Cloudflare R2 (free tier) quando for produção real (ver plano, seção
 * "Infraestrutura gratuita"); a troca fica isolada neste arquivo.
 */
export const UPLOADS_ROOT = join(process.cwd(), "uploads");

export function documentStorage() {
  return diskStorage({
    // Só usa `tenantId` (resolvido pelo TenantGuard antes do multer rodar) —
    // nunca `req.body.patientId`, que multipart/form-data só termina de
    // popular DEPOIS que o multer processa o campo "file" quando ele vem
    // antes de "patientId" no form (ordem de campos importa em multipart).
    // O vínculo com o paciente já fica registrado no Document.patientId.
    destination: (req, _file, callback) => {
      const clinicId = (req as unknown as { tenantId?: string }).tenantId ?? "unknown-clinic";
      const dir = join(UPLOADS_ROOT, clinicId);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      callback(null, dir);
    },
    filename: (_req, file, callback) => {
      callback(null, `${randomUUID()}-${file.originalname}`);
    },
  });
}
