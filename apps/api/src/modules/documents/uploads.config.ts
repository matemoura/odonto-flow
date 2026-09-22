import { memoryStorage } from "multer";

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
 * Os bytes ficam só em memória (`file.buffer`) até o serviço gravá-los na
 * coluna `Document.content`, no Postgres — nunca tocam o disco local, que é
 * efêmero em qualquer host de container (Railway, Render, etc.) e some a
 * cada redeploy. Trocar para object storage (R2/S3) no futuro significa
 * mexer só em `DocumentsService.create`/`getFileForDownload`, não aqui.
 */
export function documentMemoryStorage() {
  return memoryStorage();
}
