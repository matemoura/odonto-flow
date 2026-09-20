import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@odontoflow/ui";
import { getCommissionReport } from "../../../../lib/api";
import { formatarData } from "../../../../lib/datas";
import { fusoDaClinica } from "../../../../lib/fuso-servidor";
import { getStaffSession } from "../../../../lib/session";
import s from "../../admin.module.css";

export const metadata = { title: "Comissões — Odonto Flow" };

function formatCents(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

/**
 * Mês corrente como padrão. Montado com os getters locais (sem `toISOString`,
 * que converteria para UTC e viraria o mês anterior nas primeiras horas do
 * dia) — mesmo cuidado de `/painel`.
 */
function mesCorrente() {
  const agora = new Date();
  const iso = (ano: number, mes: number, dia: number) =>
    `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
  const ano = agora.getFullYear();
  const mes = agora.getMonth() + 1;
  const ultimoDia = new Date(ano, mes, 0).getDate();
  return { from: iso(ano, mes, 1), to: iso(ano, mes, ultimoDia) };
}

/**
 * Fechamento de comissão.
 *
 * A comissão era calculada e acumulada a cada baixa desde a Fase 2, e o
 * endpoint que a listava não tinha NENHUM consumidor — o único lugar onde ela
 * aparecia era um total agregado no ranking do Painel, sem detalhe, sem
 * período, sem como conferir. Fechar o mês e pagar a Dra. X era impossível
 * pela interface.
 */
export default async function ComissoesPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const session = await getStaffSession();
  if (!session) redirect("/entrar");
  const fuso = await fusoDaClinica(session.clinicSlug);

  const padrao = mesCorrente();
  const { from: fromParam, to: toParam } = await searchParams;
  const from = fromParam ?? padrao.from;
  const to = toParam ?? padrao.to;

  let relatorio;
  try {
    relatorio = await getCommissionReport(session.clinicSlug, session.token, from, to);
  } catch {
    return (
      <div className={s.pagina}>
        <p className={s.erro} role="alert">
          Não foi possível carregar as comissões agora. Só administradores da clínica veem esta tela.
        </p>
      </div>
    );
  }

  return (
    <div className={s.pagina}>
      <div className={s.cabecalho}>
        <h1 className={s.titulo}>Comissões</h1>
        <Link href="/financeiro" className="odontoflow-btn odontoflow-btn--secondary odontoflow-btn--sm">
          ← Financeiro
        </Link>
      </div>

      <form method="GET" style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
        <div className={s.campo}>
          <label className={s.rotuloCampo} htmlFor="from">
            De
          </label>
          <input id="from" type="date" name="from" defaultValue={from} className={s.input} style={{ maxWidth: 170 }} />
        </div>
        <div className={s.campo}>
          <label className={s.rotuloCampo} htmlFor="to">
            Até
          </label>
          <input id="to" type="date" name="to" defaultValue={to} className={s.input} style={{ maxWidth: 170 }} />
        </div>
        <Button type="submit" variant="secondary">
          Filtrar
        </Button>
      </form>

      <p className={s.dica}>
        A comissão entra na conta no dia em que a parcela é <strong>quitada</strong>, não no vencimento —
        comissão se paga sobre o que entrou.
      </p>

      {relatorio.entries.length === 0 ? (
        <p className={s.vazio}>
          Nenhuma comissão neste período. Ela é gerada sozinha quando um recebimento de um profissional com
          percentual cadastrado é marcado como pago.
        </p>
      ) : (
        <>
          {/* O que a clínica precisa para pagar: um número por pessoa. */}
          <div className={s.blocos}>
            {relatorio.porProfissional.map((pessoa) => (
              <div key={pessoa.professionalId} className={s.bloco}>
                <div className={s.tituloComSelo}>
                  <h2 className={s.blocoTitulo}>{pessoa.nome}</h2>
                  <span className="chip chip--estatico">{pessoa.quantidade} recebimento(s)</span>
                </div>
                <strong style={{ fontSize: "1.4rem" }}>{formatCents(pessoa.totalCents)}</strong>
              </div>
            ))}
          </div>

          <p className={s.totalDoPeriodo}>
            Total do período: <strong>{formatCents(relatorio.totalCents)}</strong>
          </p>

          <h2 className={s.blocoTitulo}>Detalhe</h2>
          <div style={{ overflowX: "auto" }}>
            <table className={s.tabela}>
              <thead>
                <tr>
                  <th>Quitado em</th>
                  <th>Profissional</th>
                  <th>Paciente</th>
                  <th>Categoria</th>
                  <th>Recebimento</th>
                  <th>Comissão</th>
                </tr>
              </thead>
              <tbody>
                {relatorio.entries.map((entry) => (
                  <tr key={entry.id}>
                    <td>{formatarData(entry.transaction.paidAt ?? entry.createdAt, fuso)}</td>
                    <td>{entry.professional.user.name}</td>
                    <td>{entry.transaction.patient?.name ?? "—"}</td>
                    <td>{entry.transaction.category}</td>
                    <td>{formatCents(entry.transaction.amountCents)}</td>
                    <td>
                      <strong>{formatCents(entry.amountCents)}</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
