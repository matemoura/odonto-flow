import Link from "next/link";
import { redirect } from "next/navigation";
import { getProcedures } from "../../../lib/api";
import { getStaffSession } from "../../../lib/session";
import s from "../admin.module.css";

export const metadata = { title: "Serviços — Odonto Flow" };

function formatCents(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

export default async function ServicosPage() {
  const session = await getStaffSession();
  if (!session) redirect("/entrar");
  if (session.role !== "CLINIC_ADMIN" && session.role !== "ORG_ADMIN") redirect("/agenda");

  let procedures;
  try {
    procedures = await getProcedures(session.clinicSlug, session.token);
  } catch {
    return (
      <div className={s.pagina}>
        <p className={s.erro} role="alert">
          Não foi possível carregar os serviços agora.
        </p>
      </div>
    );
  }

  return (
    <div className={s.pagina}>
      <div className={s.cabecalho}>
        <h1 className={s.titulo}>Serviços</h1>
        <Link href="/servicos/novo" className="odontoflow-btn odontoflow-btn--primary">
          + Novo serviço
        </Link>
      </div>

      {procedures.length === 0 ? (
        <p className={s.vazio}>Nenhum serviço cadastrado ainda.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table className={s.tabela}>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Código</th>
                <th>Preço de venda</th>
                <th>Custo estimado</th>
                <th>Margem</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {procedures.map((p) => {
                const margemCents = p.defaultPriceCents - p.estimatedCostCents;
                return (
                  <tr key={p.id}>
                    <td>
                      <Link href={`/servicos/${p.id}`}>{p.name}</Link>
                    </td>
                    <td>{p.code ?? "—"}</td>
                    <td>{formatCents(p.defaultPriceCents)}</td>
                    <td>{formatCents(p.estimatedCostCents)}</td>
                    <td>{formatCents(margemCents)}</td>
                    <td>
                      <span className={p.active ? "chip chip--estatico" : "chip chip--estatico chip--alerta"}>
                        {p.active ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
