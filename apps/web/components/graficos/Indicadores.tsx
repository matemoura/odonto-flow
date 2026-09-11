import type { ReactNode } from "react";
import s from "./graficos.module.css";

export type Indicador = {
  rotulo: string;
  valor: string;
  nota?: string;
  tom?: "positivo" | "negativo";
};

/** Fila de números-resumo. Um número sozinho é um indicador, nunca um gráfico de uma barra só. */
export function Indicadores({ itens }: { itens: Indicador[] }) {
  return (
    <div className={s.indicadores}>
      {itens.map((item) => (
        <div key={item.rotulo} className={s.indicador}>
          <span className={s.indicadorRotulo}>{item.rotulo}</span>
          <span className={s.indicadorValor}>{item.valor}</span>
          {item.nota ? (
            <span
              className={`${s.indicadorNota} ${
                item.tom === "positivo" ? s.indicadorPositivo : item.tom === "negativo" ? s.indicadorNegativo : ""
              }`}
            >
              {item.nota}
            </span>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function GradeGraficos({ children }: { children: ReactNode }) {
  return <div className={s.grade}>{children}</div>;
}

/**
 * Agrupa indicadores e gráficos por assunto. O rótulo diz de que parte do
 * negócio aquele bloco fala — sem ele, o painel vira um paredão de números
 * onde tudo parece ter o mesmo peso.
 */
export function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className={s.secao} aria-label={titulo}>
      <h2 className={s.secaoTitulo}>{titulo}</h2>
      {children}
    </section>
  );
}

export function FaixaLarga({ children }: { children: ReactNode }) {
  return <div className={s.gradeLarga}>{children}</div>;
}
