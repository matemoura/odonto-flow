import { redirect } from "next/navigation";
import { getDashboardOverview, PAYMENT_METHOD_LABEL } from "../../../lib/api";
import { getStaffSession } from "../../../lib/session";
import { ColunasPorMes } from "../../../components/graficos/ColunasPorMes";
import { BarraEmpilhada } from "../../../components/graficos/BarraEmpilhada";
import { BarrasRanking } from "../../../components/graficos/BarrasRanking";
import { Indicadores, GradeGraficos, FaixaLarga, Secao } from "../../../components/graficos/Indicadores";
import { CORES, formatarInteiro, formatarReais } from "../../../components/graficos/viz";
import s from "../admin.module.css";

export const metadata = { title: "Painel — Odonto Flow" };

/** Padrão: os 6 meses que terminam no mês corrente. */
function periodoPadrao() {
  const hoje = new Date();
  const inicio = new Date(hoje.getFullYear(), hoje.getMonth() - 5, 1);
  const fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
  const iso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { from: iso(inicio), to: iso(fim) };
}

export default async function PainelPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const session = await getStaffSession();
  if (!session) redirect("/entrar");

  const padrao = periodoPadrao();
  const { from: fromParam, to: toParam } = await searchParams;
  const from = fromParam ?? padrao.from;
  const to = toParam ?? padrao.to;

  let dados;
  try {
    dados = await getDashboardOverview(session.clinicSlug, session.token, { from, to });
  } catch {
    return (
      <div className={s.pagina}>
        <p className={s.erro} role="alert">
          Não foi possível carregar o painel agora. Só administradores da clínica têm acesso a esta tela.
        </p>
      </div>
    );
  }

  const { faturamento, agenda, profissionais, orcamentos } = dados;
  const meses = faturamento.porMes.map((m) => m.mes);

  const fatiasFormaPagamento = faturamento.porForma.map((f, i) => ({
    nome: f.metodo === "SEM_REGISTRO" ? "Não registrado" : PAYMENT_METHOD_LABEL[f.metodo],
    // "não registrado" é ausência de dado, não uma categoria — vai de cinza e
    // não gasta um slot da paleta categórica
    cor: f.metodo === "SEM_REGISTRO" ? CORES.neutro : [CORES.serie1, CORES.serie2, CORES.serie3][i % 3],
    valor: f.totalCents,
  }));

  return (
    <div className={s.pagina}>
      <div className={s.cabecalho}>
        <h1 className={s.titulo}>Painel</h1>
        <form method="GET" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <input type="date" name="from" defaultValue={from} className={s.input} style={{ maxWidth: 160 }} />
          <span style={{ fontSize: 12, color: "var(--tinta-55)" }}>até</span>
          <input type="date" name="to" defaultValue={to} className={s.input} style={{ maxWidth: 160 }} />
          <button type="submit" className="odontoflow-btn odontoflow-btn--secondary odontoflow-btn--sm">
            Filtrar
          </button>
        </form>
      </div>

      <Secao titulo="Dinheiro">
        <Indicadores
          itens={[
            { rotulo: "Recebido (líquido)", valor: formatarReais(faturamento.liquidoCents) },
            {
              rotulo: "Taxas de cartão",
              valor: formatarReais(faturamento.taxasCents),
              nota: "retido pela operadora",
              tom: faturamento.taxasCents > 0 ? "negativo" : undefined,
            },
            { rotulo: "Despesas pagas", valor: formatarReais(faturamento.despesaPagaCents) },
            {
              rotulo: "Saldo",
              valor: formatarReais(faturamento.saldoCents),
              tom: faturamento.saldoCents >= 0 ? "positivo" : "negativo",
            },
            { rotulo: "A receber", valor: formatarReais(faturamento.aReceberCents), nota: "ainda não quitado" },
          ]}
        />
        <GradeGraficos>
          <FaixaLarga>
            <ColunasPorMes
              titulo="Receita e despesa por mês"
              subtitulo="Pelo vencimento do lançamento, no fuso da clínica."
              meses={meses}
              series={[
                { nome: "Receita", cor: CORES.serie1, valores: faturamento.porMes.map((m) => m.receitaCents) },
                { nome: "Despesa", cor: CORES.serie2, valores: faturamento.porMes.map((m) => m.despesaCents) },
              ]}
              formato="reais"
            />
          </FaixaLarga>
          <FaixaLarga>
            <BarraEmpilhada
              titulo="Como o dinheiro entrou"
              subtitulo="Formas de pagamento das receitas já quitadas."
              fatias={fatiasFormaPagamento}
              formato="reais"
            />
          </FaixaLarga>
        </GradeGraficos>
      </Secao>

      <Secao titulo="Agenda">
        <Indicadores
          itens={[
            { rotulo: "Consultas", valor: formatarInteiro(agenda.total), nota: "agendadas no período" },
            { rotulo: "Concluídas", valor: formatarInteiro(agenda.concluidas) },
            {
              rotulo: "Taxa de falta",
              valor: `${agenda.taxaFaltaPct}%`,
              nota: `${agenda.faltas} falta(s)`,
              tom: agenda.taxaFaltaPct > 10 ? "negativo" : undefined,
            },
          ]}
        />
        <GradeGraficos>
          <ColunasPorMes
            titulo="Consultas por mês"
            subtitulo="Tudo que foi agendado no período."
            meses={meses}
            series={[{ nome: "Consultas", cor: CORES.marca, valores: agenda.porMes.map((m) => m.total) }]}
            formato="inteiro"
          />
          <BarrasRanking
            titulo="Receita por profissional"
            subtitulo="Receitas já recebidas, atribuídas ao profissional do lançamento."
            linhas={profissionais.map((p) => ({
              rotulo: p.nome,
              valor: p.receitaCents,
              nota: `${p.atendimentos} atendimento(s) · comissão ${formatarReais(p.comissaoCents)}`,
            }))}
            formato="reais"
            cabecalhoValor="Receita"
          />
        </GradeGraficos>
      </Secao>

      <Secao titulo="Orçamentos">
        <Indicadores
          itens={[
            {
              rotulo: "Conversão",
              valor: `${orcamentos.taxaConversaoPct}%`,
              nota: `${orcamentos.qtdAprovado} de ${orcamentos.qtdTotal} aprovados`,
            },
            {
              rotulo: "Parado no funil",
              valor: formatarReais(orcamentos.pendenteCents),
              nota: "aguardando decisão",
            },
            { rotulo: "Aprovado no período", valor: formatarReais(orcamentos.aprovadoCents), tom: "positivo" },
          ]}
        />
        <GradeGraficos>
          <FaixaLarga>
            <BarrasRanking
              titulo="Orçamentos por situação"
              subtitulo="Valor total dos orçamentos criados no período."
              linhas={[
                { rotulo: "Aprovado", valor: orcamentos.aprovadoCents },
                { rotulo: "Aguardando", valor: orcamentos.pendenteCents },
                { rotulo: "Recusado/expirado", valor: orcamentos.recusadoCents },
              ]}
              formato="reais"
              cabecalhoValor="Valor"
            />
          </FaixaLarga>
        </GradeGraficos>
      </Secao>
    </div>
  );
}
