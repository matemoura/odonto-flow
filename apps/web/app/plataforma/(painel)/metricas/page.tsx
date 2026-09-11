import { redirect } from "next/navigation";
import { getPlatformMetrics } from "../../../../lib/api";
import { getPlatformSession } from "../../../../lib/session";
import { ColunasPorMes } from "../../../../components/graficos/ColunasPorMes";
import { BarraEmpilhada } from "../../../../components/graficos/BarraEmpilhada";
import { BarrasRanking } from "../../../../components/graficos/BarrasRanking";
import { Indicadores, GradeGraficos, FaixaLarga, Secao } from "../../../../components/graficos/Indicadores";
import { CORES, formatarInteiro } from "../../../../components/graficos/viz";
import s from "../painel.module.css";

export const metadata = { title: "Métricas — Painel da plataforma" };

export default async function MetricasPlataformaPage() {
  const session = await getPlatformSession();
  if (!session) redirect("/plataforma/entrar");

  let dados;
  try {
    dados = await getPlatformMetrics(session.token);
  } catch {
    return (
      <div>
        <p className={s.erro} role="alert">
          Não foi possível carregar as métricas agora.
        </p>
      </div>
    );
  }

  const { clinicas, novasPorMes, porPlano, agregados } = dados;

  return (
    <div>
      <div className={s.cabecalho}>
        <div>
          <h1 className={s.titulo}>Métricas</h1>
          <p className={s.subtitulo}>Saúde da base de clínicas clientes.</p>
        </div>
      </div>

      <div className={s.secoes}>
        <Secao titulo="Base de clientes">
          <Indicadores
            itens={[
              { rotulo: "Clínicas", valor: formatarInteiro(clinicas.total) },
              {
                rotulo: "Em dia",
                valor: formatarInteiro(clinicas.emDia),
                nota: "com acesso liberado",
                tom: "positivo",
              },
              {
                rotulo: "Inadimplentes",
                valor: formatarInteiro(clinicas.inadimplentes),
                nota: "passaram da carência",
                tom: clinicas.inadimplentes > 0 ? "negativo" : undefined,
              },
              {
                rotulo: "Suspensas",
                valor: formatarInteiro(clinicas.suspensas),
                nota: "bloqueadas manualmente",
                tom: clinicas.suspensas > 0 ? "negativo" : undefined,
              },
            ]}
          />
          <GradeGraficos>
            <FaixaLarga>
              <ColunasPorMes
                titulo="Clínicas novas por mês"
                subtitulo="Cadastros nos últimos 6 meses."
                meses={novasPorMes.map((m) => m.mes)}
                series={[{ nome: "Novas clínicas", cor: CORES.marca, valores: novasPorMes.map((m) => m.total) }]}
                formato="inteiro"
              />
            </FaixaLarga>
            {/* Estado da assinatura usa a paleta de status (não a categórica):
                a cor aqui significa bom/ruim, e vem sempre acompanhada do rótulo. */}
            <BarraEmpilhada
              titulo="Situação das assinaturas"
              subtitulo="Quantas clínicas em cada estado agora."
              fatias={[
                { nome: "Em dia", cor: CORES.bom, valor: clinicas.emDia },
                { nome: "Inadimplentes", cor: CORES.atencao, valor: clinicas.inadimplentes },
                { nome: "Suspensas", cor: CORES.critico, valor: clinicas.suspensas },
              ]}
              formato="inteiro"
            />
            <BarrasRanking
              titulo="Clínicas por plano"
              subtitulo="Plano escolhido no cadastro."
              linhas={porPlano.map((p) => ({ rotulo: p.plano, valor: p.total }))}
              formato="inteiro"
              cabecalhoValor="Clínicas"
            />
          </GradeGraficos>
        </Secao>

        <Secao titulo="Uso da plataforma">
          <Indicadores
            itens={[
              { rotulo: "Pacientes na base", valor: formatarInteiro(agregados.pacientes) },
              { rotulo: "Profissionais", valor: formatarInteiro(agregados.profissionais) },
              { rotulo: "Consultas no mês", valor: formatarInteiro(agregados.consultasNoMes) },
            ]}
          />
        </Secao>
      </div>
    </div>
  );
}
