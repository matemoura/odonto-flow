"use client";

import { useState } from "react";
import { caminhoColuna, FORMATADORES, marcasDoEixo, rotuloMes, type Formato } from "./viz";
import { useLargura } from "./useLargura";
import s from "./graficos.module.css";

export type SerieColunas = { nome: string; cor: string; valores: number[] };

const GAP = 2; // respiro de superfície entre colunas vizinhas
const ESPESSURA_MAX = 24;

export function ColunasPorMes({
  titulo,
  subtitulo,
  meses,
  series,
  formato,
}: {
  titulo: string;
  subtitulo?: string;
  meses: string[];
  series: SerieColunas[];
  formato: Formato;
}) {
  const [ativo, setAtivo] = useState<number | null>(null);
  const [ref, largura] = useLargura<HTMLDivElement>();
  const { completo: formatar, eixo: formatarEixo } = FORMATADORES[formato];

  const estreito = largura < 420;
  const altura = estreito ? 190 : 240;
  const margem = {
    topo: 14,
    direita: 8,
    baixo: 28,
    // em reais o rótulo do eixo é longo ("R$ 3,9 mil"); em contagem, curto
    esquerda: formato === "reais" ? (estreito ? 54 : 62) : 34,
  };

  const larguraPlot = Math.max(largura - margem.esquerda - margem.direita, 10);
  const alturaPlot = altura - margem.topo - margem.baixo;
  const maximo = Math.max(...series.flatMap((serie) => serie.valores), 0);
  const marcas = marcasDoEixo(maximo, estreito ? 3 : 4);
  const topo = marcas[marcas.length - 1] || 1;

  const larguraBanda = larguraPlot / Math.max(meses.length, 1);
  const espessura = Math.min(
    ESPESSURA_MAX,
    Math.max(3, (larguraBanda * 0.62 - GAP * (series.length - 1)) / series.length),
  );
  const larguraGrupo = espessura * series.length + GAP * (series.length - 1);
  // rótulo de mês ocupa ~38px; se não couber, mostra um sim outro não
  const passoRotulo = larguraBanda < 40 ? 2 : 1;

  const y = (valor: number) => margem.topo + alturaPlot - (valor / topo) * alturaPlot;
  const semDados = maximo === 0;

  return (
    <div className={s.cartao}>
      <div>
        <h3 className={s.titulo}>{titulo}</h3>
        {subtitulo ? <p className={s.subtitulo}>{subtitulo}</p> : null}
      </div>

      {series.length > 1 ? (
        <ul className={s.legenda}>
          {series.map((serie) => (
            <li key={serie.nome} className={s.legendaItem}>
              <span className={s.legendaMarca} style={{ background: serie.cor }} aria-hidden="true" />
              {serie.nome}
            </li>
          ))}
        </ul>
      ) : null}

      {semDados ? (
        <p className={s.vazio}>Sem movimento no período.</p>
      ) : (
        <div className={s.areaHover} ref={ref} style={{ minHeight: altura }}>
          {largura > 0 ? (
            <svg width={largura} height={altura} className={s.svg} role="img" aria-label={titulo}>
              {marcas.map((marca) => (
                <g key={marca}>
                  <line
                    x1={margem.esquerda}
                    x2={largura - margem.direita}
                    y1={y(marca)}
                    y2={y(marca)}
                    stroke={marca === 0 ? "#c3c2b7" : "#e1e0d9"}
                    strokeWidth={1}
                  />
                  <text
                    x={margem.esquerda - 8}
                    y={y(marca) + 4}
                    textAnchor="end"
                    fontSize={11}
                    fill="#898781"
                    style={{ fontVariantNumeric: "tabular-nums" }}
                  >
                    {formatarEixo(marca)}
                  </text>
                </g>
              ))}

              {meses.map((mes, i) => {
                const centro = margem.esquerda + larguraBanda * (i + 0.5);
                const ultimo = i === meses.length - 1;
                return (
                  <g key={mes}>
                    {series.map((serie, j) => {
                      const valor = serie.valores[i] ?? 0;
                      const alturaColuna = (valor / topo) * alturaPlot;
                      const x = centro - larguraGrupo / 2 + j * (espessura + GAP);
                      return (
                        <path
                          key={serie.nome}
                          d={caminhoColuna(x, y(valor), espessura, alturaColuna)}
                          fill={serie.cor}
                          opacity={ativo === null || ativo === i ? 1 : 0.45}
                        />
                      );
                    })}
                    {/* o mês mais recente é o que importa: nunca fica sem rótulo */}
                    {i % passoRotulo === 0 || ultimo ? (
                      <text x={centro} y={altura - 9} textAnchor="middle" fontSize={11} fill="#898781">
                        {rotuloMes(mes)}
                      </text>
                    ) : null}
                    <rect
                      x={margem.esquerda + larguraBanda * i}
                      y={margem.topo}
                      width={larguraBanda}
                      height={alturaPlot}
                      fill="transparent"
                      onMouseEnter={() => setAtivo(i)}
                      onMouseLeave={() => setAtivo(null)}
                    />
                  </g>
                );
              })}
            </svg>
          ) : null}

          {ativo !== null && largura > 0 ? (
            <div
              className={s.tooltip}
              style={{
                left: Math.min(
                  Math.max(margem.esquerda + larguraBanda * (ativo + 0.5), 70),
                  Math.max(largura - 70, 70),
                ),
                top: margem.topo,
              }}
            >
              <div className={s.tooltipTitulo}>{rotuloMes(meses[ativo])}</div>
              {series.map((serie) => (
                <div key={serie.nome} className={s.tooltipLinha}>
                  <span className={s.tooltipMarca} style={{ background: serie.cor }} aria-hidden="true" />
                  {serie.nome}
                  <span className={s.tooltipValor}>{formatar(serie.valores[ativo] ?? 0)}</span>
                </div>
              ))}
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
                <th>Mês</th>
                {series.map((serie) => (
                  <th key={serie.nome}>{serie.nome}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {meses.map((mes, i) => (
                <tr key={mes}>
                  <td>{rotuloMes(mes)}</td>
                  {series.map((serie) => (
                    <td key={serie.nome}>{formatar(serie.valores[i] ?? 0)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
