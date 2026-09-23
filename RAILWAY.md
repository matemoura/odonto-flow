# Deploy no Railway

Este projeto é um monorepo pnpm/Turborepo com dois apps (`apps/api`, `apps/web`)
e um Postgres. No Railway isso vira **um projeto com três serviços**: o
Postgres (plugin) e os dois apps, cada um configurado por um dos arquivos na
raiz do repo (`railway.api.toml`, `railway.web.toml`).

O projeto real (`OdontoFlow` no Railway) não usa este passo a passo — os dois
serviços foram criados direto pelo dashboard, sem **Config-as-code file path**
apontado pra `railway.api.toml`/`railway.web.toml`. Confirmado em 23/09/2026
com `railway config pull`: o `buildCommand` de verdade era só `pnpm --filter
@odontoflow/api build`, sem o passo de migration nenhum. Se for configurar um
serviço novo do zero, siga este guia; se for mexer no que já existe, mexa
direto nas Settings do serviço no dashboard (ou via `railway config
apply`/`pull`, que exige `npm install railway` — o pacote do SDK de IaC).

## 1. Banco de dados

No projeto Railway: **New → Database → PostgreSQL**. Não precisa configurar
nada — o plugin expõe a variável `DATABASE_URL` para os outros serviços do
mesmo projeto referenciarem.

## 2. Serviço da API

**New → GitHub Repo** → aponte para este repositório.

Nas Settings do serviço:
- **Root Directory**: deixe a raiz do repo (não mude — veja o comentário em
  `railway.api.toml` sobre por quê).
- **Config-as-code file path**: `railway.api.toml`.

Variáveis de ambiente (Settings → Variables):

| Variável | Valor |
|---|---|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
| `WEB_APP_URL` | URL pública do serviço web (passo 3) — dá pra editar depois de criar os dois serviços |
| `JWT_ACCESS_SECRET` | `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `JWT_REFRESH_SECRET` | outro valor da mesma forma, diferente do de cima |
| `WHATSAPP_WEBHOOK_SECRET` | outro valor da mesma forma |
| `SENTRY_DSN` | opcional |

Depois de salvar, gere um domínio público em Settings → Networking → Generate
Domain.

## 3. Serviço web

Outro **New → GitHub Repo**, mesmo repositório, no mesmo projeto.

- **Root Directory**: raiz do repo (mesmo motivo do serviço da API).
- **Config-as-code file path**: `railway.web.toml`.

Variáveis de ambiente:

| Variável | Valor |
|---|---|
| `NEXT_PUBLIC_API_URL` | URL pública do serviço da API (passo 2) |
| `NEXT_PUBLIC_SENTRY_DSN` | opcional |
| `SENTRY_DSN` | opcional |

Gere um domínio público (Settings → Networking → Generate Domain) e volte no
serviço da API pra preencher `WEB_APP_URL` com essa URL — os dois serviços
precisam existir antes de fechar esse ciclo (API precisa saber a URL do web
pro CORS; web precisa saber a URL da API pra chamar).

`NEXT_PUBLIC_API_URL` entra no bundle do navegador em **build time**. Se
mudar essa variável depois do primeiro deploy, é preciso fazer um redeploy —
reiniciar o serviço sozinho não basta.

## 4. Criar o dono da plataforma

Sem isso, `/plataforma` recusa todo login e nenhuma clínica consegue ter
integração liberada. Depois do primeiro deploy da API, rode uma vez (local,
apontando `DATABASE_URL` para o Postgres do Railway, ou via `railway run` se
tiver a CLI instalada):

```bash
DATABASE_URL="<a mesma string do serviço da API>" \
SUPER_ADMIN_EMAIL="voce@exemplo.com" \
SUPER_ADMIN_PASSWORD="..." \
pnpm db:create-super-admin
```

**Não rode `pnpm db:seed` em produção** — ele planta a clínica de
demonstração e a senha de desenvolvimento (`senha123`).

## Troubleshooting: "Não foi possível encontrar o módulo '@odontoflow/db'"

Se o build da API falhar com centenas de erros TS2307/TS2339 (`@odontoflow/db`
não encontrado, `PrismaService` sem nenhuma propriedade), quase sempre é a
mesma causa: o Prisma Client não foi gerado antes do `nest build` — o pacote
`@odontoflow/db` aponta `main`/`types` direto pra `generated/client/`, uma
pasta que não existe até alguém rodar `prisma generate` (ela é gitignored de
propósito, é build output).

Isso acontecia quando o Railway ignorava o `buildCommand` deste arquivo e
rodava só `pnpm --filter @odontoflow/api build` por conta própria (o Railpack
faz uma detecção automática de monorepo pnpm e às vezes decide o comando de
build sozinho, sem carregar o `railway.api.toml` — normalmente porque o
**Config-as-code file path** não foi configurado nas Settings do serviço; veja
o passo 2 acima).

Duas camadas de proteção contra isso:
1. **`apps/api/package.json`** — o script `build` agora é `pnpm --filter
   @odontoflow/db generate && pnpm --filter "@odontoflow/integration-*" build
   && nest build`, então ele sempre gera o client e compila os pacotes de
   integração sozinho, não importa qual comando externo o dispare.
2. `prisma migrate deploy` não depende deste risco — desde 23/09/2026 ele vive
   em **Settings → Deploy → Pre-Deploy Command**, não no `buildCommand`, então
   roda independente de qual comando de build o Railpack decidir usar. Ver
   "Migrations em deploys futuros" abaixo.

## Troubleshooting: "Não foi possível encontrar o módulo '@odontoflow/integration-*'"

Mesma causa raiz do erro acima, um andar abaixo: `apps/api/src/modules/integrations/*-gateway.service.ts`
importa `@odontoflow/integration-whatsapp`, `-nfe`, `-e-signature`,
`-credit-score` e `-ai-assistant` — cada um desses pacotes aponta `main`/`types`
para `dist/`, que só existe depois de rodar `tsc` dentro de cada um (`build`
deles). Sem isso, os mesmos erros TS2307 aparecem, um por integração.

Isso já está coberto pelo script `build` de `apps/api/package.json` (item 1
acima). Se voltar a acontecer, o suspeito é o **filtro do pnpm**: o script
roda com a pasta de trabalho em `apps/api/`, então um filtro por *caminho*
(`--filter "./packages/integrations/*"`) resolve relativo a
`apps/api/packages/integrations/*` — que não existe — e casa **zero
pacotes**, silenciosamente, sem erro nem aviso algum (mesmo gotcha do
`pnpm --filter` já visto no CI deste projeto). Por isso o filtro usado é por
**nome** do pacote (`--filter "@odontoflow/integration-*"`), que não depende
de cwd nenhum.

## Migrations em deploys futuros

`prisma migrate deploy` roda em **Settings → Deploy → Pre-Deploy Command** do
serviço da API, **nunca** no `buildCommand` — testado ao vivo em 23/09/2026 e
confirmado quebrado: o container de build do Railway não tem acesso à rede
privada (`postgres.railway.internal`), só o container de deploy tem, então
`prisma migrate deploy` no build sempre falha com `P1001: Can't reach
database server`, migration aditiva ou não. O Pre-Deploy Command roda depois
do build (que já passou) e antes de trocar o container em produção, com a
rede privada disponível.

Valor do campo: `pnpm --filter @odontoflow/db exec prisma migrate deploy`.

## Object storage (pendência conhecida, não resolvida por este deploy)

Uploads de documento (`apps/api/uploads`) vão para o disco do container. Todo
disco de serviço no Railway é efêmero por padrão — some a cada redeploy, a
menos que um **Volume** seja anexado ao serviço da API (Settings → Volumes).
Mesmo com Volume, isso não substitui migrar para object storage (R2/S3) antes
de qualquer clínica real subir documento; ver `README.md`, seção "O que ainda
não existe".
