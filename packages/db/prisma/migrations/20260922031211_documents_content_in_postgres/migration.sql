-- Escrita à mão (não pelo `prisma migrate dev`): dropar `storageKey` com 2
-- linhas ainda preenchidas exige confirmação interativa, que não roda neste
-- ambiente. `content` nasce opcional de propósito — o backfill dos 2
-- documentos existentes (lidos do disco antigo) roda logo em seguida, num
-- script separado; só depois uma segunda migration torna a coluna obrigatória
-- (ver 20260922031500_documents_content_not_null).
ALTER TABLE "documents" ADD COLUMN "content" BYTEA;
ALTER TABLE "documents" DROP COLUMN "storageKey";
