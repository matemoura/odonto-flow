"use client";

import { useState } from "react";
import { caminhoBarra, FORMATADORES, type Formato } from "./viz";
import { useLargura } from "./useLargura";
import s from "./graficos.module.css";

export type FatiaEmpilhada = { nome: string; cor: string; valor: number };

const ALTURA_BARRA = 24;
const GAP = 2;

/** Parte-do-todo horizontal — preferida à rosca/pizza para comparar fatias. */
export function BarraEmpilhada({
  titulo,
  subtitulo,
  fatias,
  formato,
}: {
  titulo: string;
  subtitulo?: string;
  fatias: FatiaEmpilhada[];
  formato: Formato;
}) {
  const [ativa, setAtiva] = useState<number | null>(null);
  const [ref, largura] = useLargura<HTMLDivElement>();
  const { completo: formatar } = FORMATADORES[formato];

  const total = fatias.reduce((soma, f) => soma + f.valor, 0);
  const visiveis = fatias.filter((f) => f.valor > 0);

  let deslocamento = 0;
  const desenhadas = visiveis.map((fatia, i) => {
    const larguraFatia =
      total > 0 ? (fatia.valor / total) * (largura - GAP * Math.max(visiveis.length - 1, 0)) : 0;
    const x = deslocamento;
    deslocamento += larguraFatia + GAP;
    return { ...fatia, x, largura: larguraFatia, indice: i };
  });

  return (
    <div className={s.cartao}>
      <div>
        <h3 className={s.titulo}>{titulo}</h3>
        {subtitulo ? <p className={s.subtitulo}>{subtitulo}</p> : null}
      </div>

      {total === 0 ? (
        <p className={s.vazio}>Sem movimento no período.</p>
      ) : (
        <>
          <ul className={s.legenda}>
            {fatias.map((fatia) => (
              <li key={fatia.nome} className={s.legendaItem}>
                <span className={s.legendaMarca} style={{ background: fatia.cor }} aria-hidden="true" />
                {fatia.nome} · {formatar(fatia.valor)} ({Math.round((fatia.valor / total) * 100)}%)
              </li>
            ))}
          </ul>

          <div className={s.areaHover} ref={ref} style={{ minHeight: ALTURA_BARRA }}>
            {largura > 0 ? (
              <svg width={largura} height={ALTURA_BARRA} className={s.svg} role="img" aria-label={titulo}>
                {desenhadas.map((fatia) => (
                  <path
                    key={fatia.nome}
                    d={
                      // só as pontas do conjunto são arredondadas; miolo fica reto
                      fatia.indice === 0 || fatia.indice === desenhadas.length - 1
                        ? caminhoBarra(fatia.x, 0, fatia.largura, ALTURA_BARRA)
                        : `M ${fatia.x} 0 L ${fatia.x + fatia.largura} 0 L ${fatia.x + fatia.largura} ${ALTURA_BARRA} L ${fatia.x} ${ALTURA_BARRA} Z`
                    }
                    fill={fatia.cor}
                    opacity={ativa === null || ativa === fatia.indice ? 1 : 0.45}
                    onMouseEnter={() => setAtiva(fatia.indice)}
                    onMouseLeave={() => setAtiva(null)}
                  />
                ))}
              </svg>
            ) : null}

            {ativa !== null && desenhadas[ativa] ? (
              <div
                className={s.tooltip}
                style={{
                  left: Math.min(
                    Math.max(desenhadas[ativa].x + desenhadas[ativa].largura / 2, 70),
                    Math.max(largura - 70, 70),
                  ),
                  top: 0,
                }}
              >
                <div className={s.tooltipLinha}>
                  <span className={s.tooltipMarca} style={{ background: desenhadas[ativa].cor }} aria-hidden="true" />
                  {desenhadas[ativa].nome}
                  <span className={s.tooltipValor}>{formatar(desenhadas[ativa].valor)}</span>
                </div>
              </div>
            ) : null}
          </div>
        </>
      )}

      <details className={s.tabelaResumo}>
        <summary>Ver como tabela</summary>
        <div className={s.tabelaRolagem}>
          <table>
            <thead>
              <tr>
                <th>Fatia</th>
                <th>Valor</th>
                <th>Participação</th>
              </tr>
            </thead>
            <tbody>
              {fatias.map((fatia) => (
                <tr key={fatia.nome}>
                  <td>{fatia.nome}</td>
                  <td>{formatar(fatia.valor)}</td>
                  <td>{total > 0 ? `${Math.round((fatia.valor / total) * 100)}%` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
