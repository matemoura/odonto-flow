import * as argon2 from "argon2";
import { PrismaClient } from "../generated/client";

/**
 * Cria (ou promove) o dono da plataforma num banco já existente.
 *
 * Por que isto existe: `User.isSuperAdmin` só era escrito pelo `seed.ts`, e o
 * seed não roda em produção — ele planta a clínica de demonstração e a senha
 * de desenvolvimento. O resultado era um banco novo sem NENHUM caminho para
 * criar o dono: o deploy subia verde, clínicas conseguiam se cadastrar
 * sozinhas, e `/plataforma` recusava todo login. Como a liberação de
 * integrações depende do dono, clínica nova também nascia sem integração
 * nenhuma e sem ninguém que pudesse liberar.
 *
 * É um script de linha de comando, e não uma rota HTTP, de propósito: uma rota
 * de bootstrap fica exposta para sempre e vira porta de entrada no dia em que
 * alguém errar a guarda. Aqui, quem já tem acesso ao banco é quem promove.
 *
 * Uso:
 *   SUPER_ADMIN_EMAIL=voce@exemplo.com SUPER_ADMIN_PASSWORD='...' \
 *     pnpm --filter @odontoflow/db create-super-admin
 *
 * É idempotente: rodar de novo com o mesmo e-mail atualiza a senha e mantém a
 * pessoa como dono — útil para recuperar acesso.
 */
const prisma = new PrismaClient();

const SENHA_MINIMA = 12;

async function main() {
  const email = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SUPER_ADMIN_PASSWORD;
  const name = process.env.SUPER_ADMIN_NAME?.trim() || "Dono da plataforma";

  if (!email || !password) {
    throw new Error(
      "Faltam SUPER_ADMIN_EMAIL e SUPER_ADMIN_PASSWORD. Ex.:\n" +
        "  SUPER_ADMIN_EMAIL=voce@exemplo.com SUPER_ADMIN_PASSWORD='...' pnpm --filter @odontoflow/db create-super-admin",
    );
  }
  if (!email.includes("@")) {
    throw new Error(`"${email}" não parece um e-mail.`);
  }
  // Esta conta vê e administra TODAS as clínicas da plataforma. O piso aqui é
  // maior que o do cadastro normal de propósito.
  if (password.length < SENHA_MINIMA) {
    throw new Error(`A senha do dono da plataforma precisa de ao menos ${SENHA_MINIMA} caracteres.`);
  }

  const passwordHash = await argon2.hash(password);
  const existente = await prisma.user.findUnique({ where: { email }, select: { id: true } });

  const user = await prisma.user.upsert({
    where: { email },
    update: { isSuperAdmin: true, passwordHash },
    create: { email, name, passwordHash, isSuperAdmin: true },
    select: { id: true, email: true, name: true },
  });

  console.log(
    existente
      ? `Usuário ${user.email} promovido a dono da plataforma (senha atualizada).`
      : `Dono da plataforma criado: ${user.email}.`,
  );
  console.log("Entre em /plataforma/entrar.");
}

main()
  .catch((erro) => {
    console.error(erro instanceof Error ? erro.message : erro);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
