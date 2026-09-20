-- Número de WhatsApp da clínica (remetente). Quem preenche é o dono da clínica.
ALTER TABLE "clinics" ADD COLUMN "whatsappPhone" TEXT;

-- A liberação de integração passou a ser decisão do dono da plataforma, e
-- ausência de linha passou a significar "não liberada".
ALTER TABLE "integration_configs" ALTER COLUMN "enabled" SET DEFAULT false;

-- Backfill: toda clínica que já existe continua com as 5 integrações em modo
-- mock, exatamente como se comportava antes desta migração. Sem isso, subir
-- esta versão desligaria integração de cliente que não pediu nada — o dono da
-- plataforma desliga o que quiser depois, na tela dele.
INSERT INTO "integration_configs" ("id", "clinicId", "kind", "providerName", "enabled", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  c."id",
  k."kind",
  'mock',
  true,
  NOW(),
  NOW()
FROM "clinics" c
CROSS JOIN (
  SELECT unnest(ARRAY['WHATSAPP', 'AI_ASSISTANT', 'NFE', 'E_SIGNATURE', 'CREDIT_SCORE']::"IntegrationKind"[]) AS kind
) k
ON CONFLICT ("clinicId", "kind") DO NOTHING;
