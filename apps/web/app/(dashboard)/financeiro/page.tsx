import Link from "next/link";
import { redirect } from "next/navigation";
import {
  getCashFlowSummary,
  getStaffProfessionals,
  getTransactions,
  INVOICE_STATUS_LABEL,
  PAYMENT_METHOD_LABEL,
  type InvoiceStatus,
} from "../../../lib/api";
import { formatarData } from "../../../lib/datas";
import { fusoDaClinica } from "../../../lib/fuso-servidor";
import { getStaffSession } from "../../../lib/session";
import { NovaTransacaoForm } from "./NovaTransacaoForm";
import { MarcarPagoButton } from "./MarcarPagoButton";
import { IssueInvoiceButton } from "./IssueInvoiceButton";
import s from "../admin.module.css";
import f from "./financeiro.module.css";

export const metadata = { title: "Financeiro — Odonto Flow" };

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

export default async function FinanceiroPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const session = await getStaffSession();
  if (!session) redirect("/entrar");
  const fuso = await fusoDaClinica(session.clinicSlug);

  const defaults = currentMonthRange();
  const { from: fromParam, to: toParam } = await searchParams;
  const from = fromParam ?? defaults.from;
  const to = toParam ?? defaults.to;

  let summary;
  let transactions;
  let professionals: Awaited<ReturnType<typeof getStaffProfessionals>> = [];
  try {
    [summary, transactions] = await Promise.all([
      getCashFlowSummary(session.clinicSlug, session.token, { from, to }),
      getTransactions(session.clinicSlug, session.token, { from, to }),
    ]);
  } catch {
    return (
      <div className={s.pagina}>
        <p className={s.erro} role="alert">
          Não foi possível carregar o financeiro agora.
        </p>
      </div>
    );
  }
  try {
    professionals = await getStaffProfessionals(session.clinicSlug, session.token);
  } catch {
    // ok seguir sem a lista (ex.: usuário sem permissão de ver profissionais)
  }

  const exportUrl = `/api/staff/finance/export?from=${from}&to=${to}`;

  return (
    <div className={s.pagina}>
      <div className={s.cabecalho}>
        <h1 className={s.titulo}>Financeiro</h1>
        <form method="GET" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <input type="date" name="from" defaultValue={from} className={s.input} style={{ maxWidth: 160 }} />
          <span style={{ fontSize: 12, color: "var(--tinta-55)" }}>até</span>
          <input type="date" name="to" defaultValue={to} className={s.input} style={{ maxWidth: 160 }} />
          <button type="submit" className="odontoflow-btn odontoflow-btn--secondary odontoflow-btn--sm">
            Filtrar
          </button>
        </form>
      </div>

      <div className={f.cards}>
        <div className={f.card}>
          <span className={f.cardRotulo}>Recebido (líquido)</span>
          <span className={`${f.cardValor} ${f.positivo}`}>{formatCents(summary.netIncomeCents)}</span>
        </div>
        <div className={f.card}>
          <span className={f.cardRotulo}>Taxas de cartão</span>
          <span className={f.cardValor}>− {formatCents(summary.totalFeesCents)}</span>
        </div>
        <div className={f.card}>
          <span className={f.cardRotulo}>A compensar</span>
          <span className={f.cardValor}>{formatCents(summary.pendingSettlementCents)}</span>
        </div>
        <div className={f.card}>
          <span className={f.cardRotulo}>Pago (despesas)</span>
          <span className={`${f.cardValor} ${f.negativo}`}>{formatCents(summary.totalExpenseCents)}</span>
        </div>
        <div className={f.card}>
          <span className={f.cardRotulo}>Saldo</span>
          <span className={`${f.cardValor} ${summary.balanceCents >= 0 ? f.positivo : f.negativo}`}>
            {formatCents(summary.balanceCents)}
          </span>
        </div>
        <div className={f.card}>
          <span className={f.cardRotulo}>A receber</span>
          <span className={f.cardValor}>{formatCents(summary.pendingIncomeCents)}</span>
        </div>
        <div className={f.card}>
          <span className={f.cardRotulo}>A pagar</span>
          <span className={f.cardValor}>{formatCents(summary.pendingExpenseCents)}</span>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <a href={exportUrl} className="odontoflow-btn odontoflow-btn--secondary odontoflow-btn--sm">
          Exportar Excel do período
        </a>
        <Link href="/financeiro/comissoes" className="odontoflow-btn odontoflow-btn--ghost odontoflow-btn--sm">
          Comissões do período
        </Link>
        <Link href="/financeiro/cartao" className="odontoflow-btn odontoflow-btn--ghost odontoflow-btn--sm">
          Taxa e prazo do cartão
        </Link>
      </div>

      <NovaTransacaoForm professionals={professionals} />

      {transactions.length === 0 ? (
        <p className={s.vazio}>Nenhum lançamento neste período.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table className={s.tabela}>
            <thead>
              <tr>
                <th>Vencimento</th>
                <th>Tipo</th>
                <th>Categoria</th>
                <th>Profissional</th>
                <th>Valor</th>
                <th>Status</th>
                <th>Forma</th>
                <th>Taxa</th>
                <th>Líquido</th>
                <th>Crédito em</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => (
                <tr key={t.id}>
                  <td>{formatarData(t.dueDate, fuso)}</td>
                  <td>{t.type === "INCOME" ? "Receita" : "Despesa"}</td>
                  <td>
                    {t.category}
                    {t.installmentTotal ? (
                      <span className="chip chip--estatico" style={{ marginLeft: 6 }}>
                        {t.installmentNumber}/{t.installmentTotal}
                      </span>
                    ) : null}
                  </td>
                  <td>{t.professional?.user.name ?? "—"}</td>
                  <td>{formatCents(t.amountCents)}</td>
                  <td>{t.paidAt ? "Pago" : "Pendente"}</td>
                  <td>{t.paymentMethod ? PAYMENT_METHOD_LABEL[t.paymentMethod] : "—"}</td>
                  <td>{t.feeCents > 0 ? `− ${formatCents(t.feeCents)}` : "—"}</td>
                  <td>{t.paidAt ? formatCents(t.amountCents - t.feeCents) : "—"}</td>
                  <td>
                    {t.settledAt ? (
                      new Date(t.settledAt) > new Date() ? (
                        <span className="chip chip--estatico chip--areia">
                          {formatarData(t.settledAt, fuso)}
                        </span>
                      ) : (
                        formatarData(t.settledAt, fuso)
                      )
                    ) : (
                      "—"
                    )}
                  </td>
                  {/* o flex vai num div DENTRO da célula: `display: flex` no
                      próprio <td> tira a célula do fluxo da tabela e os botões
                      escapam para fora da borda */}
                  <td>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {!t.paidAt ? <MarcarPagoButton transactionId={t.id} /> : null}
                      {t.paidAt && t.type === "INCOME" ? (
                        t.invoice ? (
                          <span
                            className={
                              t.invoice.status === "FAILED"
                                ? "chip chip--estatico chip--alerta"
                                : "chip chip--estatico"
                            }
                          >
                            NF-e{" "}
                            {INVOICE_STATUS_LABEL[t.invoice.status as InvoiceStatus] ?? t.invoice.status}
                          </span>
                        ) : (
                          <IssueInvoiceButton transactionId={t.id} />
                        )
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
