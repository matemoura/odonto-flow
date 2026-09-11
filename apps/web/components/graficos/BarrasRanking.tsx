"use client";

import { useState } from "react";
import { caminhoBarra, CORES, FORMATADORES, type Formato } from "./viz";
import { useLargura } from "./useLargura";
import s from "./graficos.module.css";

export type LinhaRanking = { rotulo: string; valor: number; nota?: string };

const ESPESSURA = 18;

/**
 * Ranking horizontal. Categorias nominais (dentistas, planos) não têm ordem
 * natural, então todas as barras usam a MESMA cor — pintar por valor gastaria
 * o canal de identidade para reencodar o que o comprimento já mostra.
 */
export function BarrasRanking({
  titulo,
  subtitulo,
  linhas,
  formato,
  cabecalhoValor = "Valor",
}: {
  titulo: string;
  subtitulo?: string;
  linhas: LinhaRanking[];
  formato: Formato;
  cabecalhoValor?: string;
}) {
  const [ativa, setAtiva] = useState<number | null>(null);
  const [ref, largura] = useLargura<HTMLDivElement>();
  const { completo: formatar } = FORMATADORES[formato];

  const maximo = Math.max(...linhas.map((l) => l.valor), 0);
  // Abaixo disso não sobra barra nenhuma se o nome ficar na mesma linha, então
  // o nome vai para cima e a barra ocupa a largura inteira.
  const empilhado = largura > 0 && largura < 380;
  const alturaLinha = empilhado ? 46 : 32;
  const larguraRotulo = empilhado ? 0 : Math.min(150, largura * 0.34);
  const larguraValor = formato === "reais" ? 86 : 44;
  const larguraPlot = Math.max(largura - larguraRotulo - larguraValor - 8, 10);
  const altura = Math.max(linhas.length * alturaLinha, alturaLinha);

  return (
    <div className={s.cartao}>
      <div>
        <h3 className={s.titulo}>{titulo}</h3>
        {subtitulo ? <p className={s.subtitulo}>{subtitulo}</p> : null}
      </div>

      {linhas.length === 0 || maximo === 0 ? (
        <p className={s.vazio}>Sem movimento no período.</p>
      ) : (
        <div className={s.areaHover} ref={ref} style={{ minHeight: altura }}>
          {largura > 0 ? (
            <svg width={largura} height={altura} className={s.svg} role="img" aria-label={titulo}>
              {linhas.map((linha, i) => {
                const y = i * alturaLinha;
                const larguraBarra = (linha.valor / maximo) * larguraPlot;
                const yBarra = empilhado ? y + 24 : y + (alturaLinha - ESPESSURA) / 2;
                return (
                  <g
                    key={linha.rotulo}
                    onMouseEnter={() => setAtiva(i)}
                    onMouseLeave={() => setAtiva(null)}
                    opacity={ativa === null || ativa === i ? 1 : 0.5}
                  >
                    <rect x={0} y={y} width={largura} height={alturaLinha} fill="transparent" />
                    <text
                      x={0}
                      y={empilhado ? y + 14 : y + alturaLinha / 2 + 4}
                      fontSize={12}
                      fill="#52514e"
                    >
                      {linha.rotulo}
                    </text>
                    <path
                      d={caminhoBarra(larguraRotulo, yBarra, larguraBarra, ESPESSURA)}
                      fill={CORES.marca}
                    />
                    {/* valor fora da ponta da barra: nunca é cortado pelo próprio dado */}
                    <text
                      x={larguraRotulo + larguraBarra + 8}
                      y={yBarra + ESPESSURA / 2 + 4}
                      fontSize={11.5}
                      fill="#52514e"
                      style={{ fontVariantNumeric: "tabular-nums" }}
                    >
                      {formatar(linha.valor)}
                    </text>
                  </g>
                );
              })}
            </svg>
          ) : null}

          {ativa !== null && linhas[ativa].nota ? (
            <div className={s.tooltip} style={{ left: largura / 2, top: ativa * alturaLinha }}>
              <div className={s.tooltipTitulo}>{linhas[ativa].rotulo}</div>
              <div>{linhas[ativa].nota}</div>
            </div>
          ) : null}
        </div>
      )}

      <details className={s.tabelaResumo}>
        <summary>Ver como tabela</summary>
        <div className={s.tabelaRolagem}>
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>{cabecalhoValor}</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((linha) => (
                <tr key={linha.rotulo}>
                  <td>
                    {linha.rotulo}
                    {linha.nota ? ` — ${linha.nota}` : ""}
                  </td>
                  <td>{formatar(linha.valor)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
