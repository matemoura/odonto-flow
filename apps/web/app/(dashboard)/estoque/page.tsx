import Link from "next/link";
import { redirect } from "next/navigation";
import { getInventoryItems, getInventoryReport } from "../../../lib/api";
import { getStaffSession } from "../../../lib/session";
import s from "../admin.module.css";

export const metadata = { title: "Estoque — Odonto Flow" };

function formatCents(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

function currentMonthRange() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { from: iso(from), to: iso(to) };
}

export default async function EstoquePage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const session = await getStaffSession();
  if (!session) redirect("/entrar");
  if (session.role !== "CLINIC_ADMIN" && session.role !== "ORG_ADMIN") redirect("/agenda");

  const defaults = currentMonthRange();
  const { from: fromParam, to: toParam } = await searchParams;
  const from = fromParam ?? defaults.from;
  const to = toParam ?? defaults.to;

  let items;
  try {
    items = await getInventoryItems(session.clinicSlug, session.token);
  } catch {
    return (
      <div className={s.pagina}>
        <p className={s.erro} role="alert">
          Não foi possível carregar o estoque agora.
        </p>
      </div>
    );
  }

  let report;
  try {
    report = await getInventoryReport(session.clinicSlug, session.token, { from, to });
  } catch {
    report = null;
  }

  const precisamRepor = items.filter((i) => i.needsRestock).length;
  const exportUrl = `/api/staff/inventory-items/report/export?from=${from}&to=${to}`;

  return (
    <div className={s.pagina}>
      <div className={s.cabecalho}>
        <h1 className={s.titulo}>Estoque</h1>
        <Link href="/estoque/novo" className="odontoflow-btn odontoflow-btn--primary">
          + Novo item
        </Link>
      </div>

      {precisamRepor > 0 ? (
        <p className={s.erro} role="alert">
          {precisamRepor} {precisamRepor === 1 ? "item precisa" : "itens precisam"} de reposição.
        </p>
      ) : null}

      {items.length === 0 ? (
        <p className={s.vazio}>Nenhum item de estoque cadastrado ainda.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table className={s.tabela}>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Unidade</th>
                <th>Custo unit.</th>
                <th>Em estoque</th>
                <th>Reservado</th>
                <th>Disponível</th>
                <th>Mínimo</th>
                <th></th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <Link href={`/estoque/${item.id}`}>{item.name}</Link>
                  </td>
                  <td>{item.unit}</td>
                  <td>{formatCents(item.unitCostCents)}</td>
                  <td>{item.quantityOnHand}</td>
                  <td>{item.quantityReserved}</td>
                  <td>{item.available}</td>
                  <td>{item.minQuantity}</td>
                  <td>
                    {item.needsRestock ? (
                      <span className="chip chip--estatico chip--alerta">Repor</span>
                    ) : null}
                  </td>
                  <td>
                    <Link href={`/estoque/${item.id}`} className="odontoflow-btn odontoflow-btn--secondary odontoflow-btn--sm">
                      Editar
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <section style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 12 }}>
        <div className={s.cabecalho}>
          <h2 style={{ fontSize: 14, fontWeight: 600 }}>Relatório por período</h2>
          <form method="GET" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <input type="date" name="from" defaultValue={from} className={s.input} style={{ maxWidth: 160 }} />
            <span style={{ fontSize: 12, color: "var(--tinta-55)" }}>até</span>
            <input type="date" name="to" defaultValue={to} className={s.input} style={{ maxWidth: 160 }} />
            <button type="submit" className="odontoflow-btn odontoflow-btn--secondary odontoflow-btn--sm">
              Filtrar
            </button>
          </form>
        </div>

        {!report ? (
          <p className={s.erro} role="alert">
            Não foi possível carregar o relatório agora.
          </p>
        ) : report.items.length === 0 ? (
          <p className={s.vazio}>Nenhum item de estoque cadastrado ainda.</p>
        ) : (
          <>
            <a href={exportUrl} className="odontoflow-btn odontoflow-btn--secondary odontoflow-btn--sm" style={{ alignSelf: "flex-start" }}>
              Exportar Excel
            </a>
            <div style={{ overflowX: "auto" }}>
              <table className={s.tabela}>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Entradas</th>
                    <th>Custo entradas</th>
                    <th>Saídas manuais</th>
                    <th>Reservado</th>
                    <th>Liberado</th>
                    <th>Consumido</th>
                    <th>Custo consumido</th>
                  </tr>
                </thead>
                <tbody>
                  {report.items.map((item) => (
                    <tr key={item.inventoryItemId}>
                      <td>{item.name}</td>
                      <td>{item.manualInQuantity}</td>
                      <td>{formatCents(item.manualInCostCents)}</td>
                      <td>{item.manualOutQuantity}</td>
                      <td>{item.reservedQuantity}</td>
                      <td>{item.releasedQuantity}</td>
                      <td>{item.consumedQuantity}</td>
                      <td>{formatCents(item.consumedCostCents)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ fontWeight: 600 }}>
                    <td>Total</td>
                    <td>{report.totals.manualInQuantity}</td>
                    <td>{formatCents(report.totals.manualInCostCents)}</td>
                    <td>{report.totals.manualOutQuantity}</td>
                    <td>{report.totals.reservedQuantity}</td>
                    <td>{report.totals.releasedQuantity}</td>
                    <td>{report.totals.consumedQuantity}</td>
                    <td>{formatCents(report.totals.consumedCostCents)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
