# Odonto Flow

SaaS multi-tenant de gestão para clínicas odontológicas: agenda com link público de
agendamento, prontuário eletrônico, orçamentos e contratos, financeiro com parcelamento
e comissionamento, e painéis de gestão com indicadores.

Monorepo TypeScript — **NestJS + Prisma/PostgreSQL** na API, **Next.js (App Router)** no
front, orquestrado com **pnpm workspaces + Turborepo**.

---

## O que já funciona

**Clínico**
- Agenda por dia e por profissional, com status de cada atendimento (agendado, confirmado, em atendimento, concluído, faltou).
- Link público de agendamento (`/agendar/[clinica]`) — o paciente escolhe profissional, serviço e horário livre sem login.
- Prontuário eletrônico append-only, odontograma com histórico por dente e ficha de anamnese.
- Ortodontia: tratamento com cronograma de etapas e acompanhamento de trocas.
- Faceograma: planejamento estético sobre foto, versionado.
- Atestados e documentos do paciente, com página pública de verificação.

**Gestão e vendas**
- Orçamentos a partir de um catálogo de serviços, com aprovação e geração de contrato.
- CRM com funil de oportunidades e funil de orçamentos não aprovados.
- Gerenciador de indicações.
- Controle de estoque de materiais.
- Equipe, profissionais e permissões por papel.

**Financeiro**
- Lançamentos de entrada e saída com fluxo de caixa.
- Forma de pagamento registrada na baixa (PIX, cartão, dinheiro).
- Parcelamento: o valor total é dividido em N parcelas com vencimentos mensais.
- Taxa da maquininha e prazo de recebimento configuráveis pela clínica — o fluxo de caixa trabalha com o valor líquido e a data real de liquidação.
- Comissionamento automático por profissional.

**Painéis**
- Painel clínico e painel financeiro, com gráficos próprios (SVG, sem biblioteca) e versão em tabela de cada gráfico.
- Indicadores de produção, ocupação da agenda, taxa de faltas e receita.

**Plataforma (dono do SaaS)**
- Área `/plataforma` separada: lista de clínicas, plano, status de inadimplência, registro de pagamento, suspensão e reativação de acesso.
- Prazo de tolerância de inadimplência configurável; a clínica perde acesso automaticamente ao ultrapassá-lo.

**Multi-unidade**
- `Organization` acima de `Clinic`, com papel `ORG_ADMIN` e visão consolidada de rede.

---

## Papéis de acesso

| Papel | Alcance |
|---|---|
| `SUPER_ADMIN` | Dono da plataforma. Só a área `/plataforma`, nunca dados clínicos. |
| `ORG_ADMIN` | Administra todas as clínicas de uma rede. |
| `CLINIC_ADMIN` | Administra uma clínica. |
| `DENTIST` | Vê apenas a própria agenda e os pacientes que atendeu. Sem acesso a gestão e financeiro. |
| `ASSISTANT` | Apoio à recepção, sem evolução clínica. |
| `PATIENT` | Portal do paciente. |

Papel administrativo e identidade clínica são independentes: um `CLINIC_ADMIN` que também
tenha registro de `Professional` atende normalmente, aparecendo na agenda como dentista.

---

## Estrutura

```
odonto-flow/
├── apps/
│   ├── api/                  # NestJS — módulos de domínio, guards de tenant e papel
│   └── web/                  # Next.js — painel, agendamento público e portal do paciente
├── packages/
│   ├── db/                   # schema Prisma, migrations, seed
│   ├── shared-types/         # DTOs e schemas Zod compartilhados
│   ├── ui/                   # design system React
│   ├── integrations/         # adapters plugáveis (ver abaixo)
│   └── config/               # eslint, tsconfig e jest compartilhados
├── infra/docker-compose.yml  # PostgreSQL + Redis locais
├── render.yaml               # blueprint de deploy da API no Render
└── .github/workflows/ci.yml  # lint, typecheck, test e build
```

O front usa o padrão BFF: as rotas em `apps/web/app/api/*` leem o cookie httpOnly da sessão
e chamam a API com o bearer token. O token nunca chega ao JavaScript do navegador.

---

## Como rodar localmente

Pré-requisitos: Node 20+, pnpm 12 e Docker.

```bash
pnpm install
docker compose -f infra/docker-compose.yml up -d
```

Copie os arquivos de exemplo de variáveis de ambiente:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
cp packages/db/.env.example packages/db/.env
```

Gere o client do Prisma, rode as migrations e popule os dados de demonstração:

```bash
pnpm db:generate && pnpm db:migrate && pnpm db:seed
```

Suba tudo em modo dev:

```bash
pnpm dev
```

- Web: http://localhost:3000
- API: http://localhost:3333 (`/health`)

> O Postgres local sobe na porta **5433** de propósito, para não colidir com um Postgres
> já instalado na máquina. No CI ele roda isolado e usa a 5432.

### Contas de demonstração

Criadas pelo `pnpm db:seed`. Senha de todas: `senha123`.

| Entrar em | Conta | Papel |
|---|---|---|
| `/entrar/vila-nova` | `admin@vilanova.com` | `ORG_ADMIN` (administra e também atende) |
| `/entrar/vila-nova` | `ana.prado@vilanova.com` | `DENTIST` |
| `/plataforma/entrar` | `dono@odontoflow.dev` | `SUPER_ADMIN` |

O link público de agendamento da clínica demo é `/agendar/vila-nova`.

---

## Scripts

| Comando | O que faz |
|---|---|
| `pnpm dev` | Sobe API e web em modo watch. |
| `pnpm build` | Build de produção de todos os pacotes. |
| `pnpm lint` | ESLint em todo o monorepo. |
| `pnpm typecheck` | `tsc --noEmit` em todo o monorepo. |
| `pnpm test` | Suíte de testes (unit + e2e da API). |
| `pnpm db:generate` | Gera o Prisma Client. |
| `pnpm db:migrate` | Aplica migrations em desenvolvimento. |
| `pnpm db:seed` | Popula a clínica de demonstração. |

---

## Isolamento entre clínicas

O modelo é *shared database, shared schema*: toda tabela operacional carrega `clinicId`.
O isolamento é garantido na aplicação, em três camadas:

1. `TenantContextMiddleware` resolve a clínica a partir do slug da requisição.
2. `TenantGuard` confirma que o usuário autenticado tem vínculo (`ClinicMembership`) com essa clínica.
3. `RolesGuard` e `SuperAdminGuard` aplicam o papel exigido por rota.

Acesso a prontuário e documentos gera registro imutável em `AuditLog` via interceptor
(`apps/api/src/common/interceptors/audit-log.interceptor.ts`), exigência de LGPD para dado
de saúde.

> **Ainda não implementado:** Row-Level Security no PostgreSQL. Hoje o isolamento depende
> exclusivamente da camada de aplicação. RLS é a rede de segurança que falta — uma query
> que esqueça o `clinicId` não tem nada abaixo dela para barrar o vazamento.

---

## Integrações de terceiros

Cada integração em `packages/integrations/*` tem um contrato (`types.ts`), uma
implementação **mock** gratuita (o padrão, usada em dev e demo) e espaço para o provedor
real, selecionável por clínica. Nenhum módulo de negócio chama o provedor direto.

| Integração | Mock (padrão) | Provedor real sugerido |
|---|---|---|
| WhatsApp | registro em banco | Meta Cloud API — nunca API não-oficial, o risco é banimento do número |
| IA (secretária/copiloto) | respostas roteirizadas | Claude, GPT |
| NFS-e | XML e PDF stub locais | Focus NFe, NFe.io, eNotas |
| Assinatura eletrônica | nome digitado + timestamp + hash | Autentique, Clicksign, D4Sign |
| Consulta de score | score determinístico a partir do CPF | Serasa, Boa Vista |

> A assinatura mock **não tem validade jurídica ICP-Brasil**, e a interface diz isso ao usuário.

---

## O que ainda não existe

Registrado aqui para que ninguém descubra em produção:

- **Gateway de pagamento.** O financeiro registra e concilia pagamentos; não processa cartão nem PIX de verdade. Para cobrança automatizada, o candidato natural no Brasil é o Asaas.
- **Row-Level Security no banco** (ver acima).
- **Object storage.** Uploads vão para o disco local da API (`apps/api/uploads`). Em host com disco efêmero isso se perde a cada deploy.
- **Redis.** Sobe no docker-compose, mas nenhum código usa ainda; está lá para as filas de uma fase futura.
- **Comissão sobre valor líquido.** Hoje a comissão é calculada sobre o bruto, antes da taxa da maquininha.

---

## Licença

Projeto privado. Sem licença de uso definida — na ausência de uma, todos os direitos são
reservados por padrão.
