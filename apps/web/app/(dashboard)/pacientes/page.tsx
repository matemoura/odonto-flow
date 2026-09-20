import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@odontoflow/ui";
import { getPatients } from "../../../lib/api";
import { formatarData } from "../../../lib/datas";
import { fusoDaClinica } from "../../../lib/fuso-servidor";
import { getStaffSession } from "../../../lib/session";
import s from "../admin.module.css";

export const metadata = { title: "Pacientes — Odonto Flow" };

export default async function PacientesPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string }>;
}) {
  const session = await getStaffSession();
  if (!session) redirect("/entrar");
  const fuso = await fusoDaClinica(session.clinicSlug);

  const { search, page } = await searchParams;
  const paginaAtual = Number(page) >= 1 ? Number(page) : 1;

  let pagina;
  try {
    pagina = await getPatients(session.clinicSlug, session.token, search, { page: paginaAtual });
  } catch {
    return (
      <div className={s.pagina}>
        <p className={s.erro} role="alert">
          Não foi possível carregar os pacientes agora.
        </p>
      </div>
    );
  }

  return (
    <div className={s.pagina}>
      <div className={s.cabecalho}>
        <h1 className={s.titulo}>Pacientes</h1>
        {/* Dentista vê só quem ele atendeu, então um paciente recém-criado por
            ele sumiria na hora (ainda não tem consulta marcada). Quem cadastra
            é a recepção — a API também recusa o POST para esse cargo. */}
        {session.role === "DENTIST" ? null : (
          <Link href="/pacientes/novo" className="odontoflow-btn odontoflow-btn--primary">
            + Novo paciente
          </Link>
        )}
      </div>

      <form method="GET" style={{ display: "flex", gap: 8 }}>
        {/* Buscar sempre reinicia na página 1: manter a página atual levaria
            a um resultado vazio quando o filtro tem menos páginas. */}
        <input type="hidden" name="page" value="1" />
        <input
          type="search"
          name="search"
          defaultValue={search ?? ""}
          placeholder="Buscar por nome…"
          className={s.input}
          style={{ maxWidth: 280 }}
        />
        <Button type="submit" variant="secondary">
          Buscar
        </Button>
      </form>

      {pagina.itens.length === 0 ? (
        <p className={s.vazio}>
          {search ? `Nenhum paciente com "${search}".` : "Nenhum paciente cadastrado ainda."}
        </p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table className={s.tabela}>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Telefone</th>
                <th>E-mail</th>
                <th>Cadastrado em</th>
              </tr>
            </thead>
            <tbody>
              {pagina.itens.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link href={`/pacientes/${p.id}`}>{p.name}</Link>
                  </td>
                  <td>{p.phone ?? "—"}</td>
                  <td>{p.email ?? "—"}</td>
                  <td>{formatarData(p.createdAt, fuso)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Navegação por página. `<Link>` e não botão: a página fica na URL, então
          a lista é compartilhável e o voltar do navegador funciona. A busca
          viaja junto — trocar de página não pode descartar o filtro. */}
      {pagina.totalDePaginas > 1 ? (
        <nav className={s.paginacao} aria-label="Páginas de pacientes">
          <Link
            href={`/pacientes?${new URLSearchParams({
              ...(search ? { search } : {}),
              page: String(pagina.page - 1),
            })}`}
            className="odontoflow-btn odontoflow-btn--secondary odontoflow-btn--sm"
            aria-disabled={pagina.page <= 1}
            style={pagina.page <= 1 ? { pointerEvents: "none", opacity: 0.45 } : undefined}
          >
            ‹ Anterior
          </Link>

          <span className={s.dica}>
            Página {pagina.page} de {pagina.totalDePaginas} · {pagina.total} paciente(s)
          </span>

          <Link
            href={`/pacientes?${new URLSearchParams({
              ...(search ? { search } : {}),
              page: String(pagina.page + 1),
            })}`}
            className="odontoflow-btn odontoflow-btn--secondary odontoflow-btn--sm"
            aria-disabled={pagina.page >= pagina.totalDePaginas}
            style={
              pagina.page >= pagina.totalDePaginas ? { pointerEvents: "none", opacity: 0.45 } : undefined
            }
          >
            Próxima ›
          </Link>
        </nav>
      ) : null}
    </div>
  );
}
