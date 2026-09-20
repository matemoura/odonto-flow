# Deploy no Railway

Este projeto é um monorepo pnpm/Turborepo com dois apps (`apps/api`, `apps/web`)
e um Postgres. No Railway isso vira **um projeto com três serviços**: o
Postgres (plugin) e os dois apps, cada um configurado por um dos arquivos na
raiz do repo (`railway.api.toml`, `railway.web.toml`).

Este arquivo nunca foi seguido num deploy real — o primeiro deploy é o teste
dele. Se algo falhar, o log de build/deploy do Railway diz onde.

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

## Migrations em deploys futuros

`prisma migrate deploy` roda dentro do `buildCommand` da API (ver
`railway.api.toml`), não num pre-deploy separado. Enquanto as migrations
forem só aditivas isso é inofensivo — elas rodam mesmo que o deploy falhe
depois. No dia em que uma migration remover coluna ou tabela, mova esse passo
para **Settings → Deploy → Pre-Deploy Command** do serviço da API (aplica a
migration só se o build passou, antes de trocar o container em produção) ou
rode a migration à mão antes do deploy.

## Object storage (pendência conhecida, não resolvida por este deploy)

Uploads de documento (`apps/api/uploads`) vão para o disco do container. Todo
disco de serviço no Railway é efêmero por padrão — some a cada redeploy, a
menos que um **Volume** seja anexado ao serviço da API (Settings → Volumes).
Mesmo com Volume, isso não substitui migrar para object storage (R2/S3) antes
de qualquer clínica real subir documento; ver `README.md`, seção "O que ainda
não existe".
