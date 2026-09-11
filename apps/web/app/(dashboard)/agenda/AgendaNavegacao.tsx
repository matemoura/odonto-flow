"use client";

import { useRouter } from "next/navigation";
import { somarDias } from "./agenda-data";
import s from "./agenda.module.css";

/**
 * Navegação da agenda: alterna dia/semana, anda para trás e para frente e volta
 * para hoje. O estado vive na URL (`?data=&vista=`), não em `useState`: assim a
 * página continua sendo Server Component (os dados vêm prontos do servidor), o
 * botão voltar do navegador funciona, e um dia específico pode ser enviado por
 * link para outra pessoa.
 */
export function AgendaNavegacao({
  data,
  vista,
  hojeIso,
  rotulo,
}: {
  data: string;
  vista: "dia" | "semana";
  hojeIso: string;
  rotulo: string;
}) {
  const router = useRouter();
  const passo = vista === "semana" ? 7 : 1;
  const ehHoje = vista === "dia" && data === hojeIso;

  function ir(novaData: string, novaVista: "dia" | "semana" = vista) {
    router.push(`/agenda?data=${novaData}&vista=${novaVista}`);
  }

  return (
    <div className={s.navegacao}>
      <div className={s.navegacaoGrupo} role="group" aria-label="Período">
        <button
          type="button"
          className="odontoflow-btn odontoflow-btn--secondary odontoflow-btn--sm"
          onClick={() => ir(somarDias(data, -passo))}
          aria-label={vista === "semana" ? "Semana anterior" : "Dia anterior"}
        >
          ‹
        </button>

        <button
          type="button"
          className={`odontoflow-btn odontoflow-btn--sm ${
            ehHoje ? "odontoflow-btn--secondary" : "odontoflow-btn--primary"
          }`}
          onClick={() => ir(hojeIso, "dia")}
          disabled={ehHoje}
          aria-disabled={ehHoje}
        >
          Hoje
        </button>

        <button
          type="button"
          className="odontoflow-btn odontoflow-btn--secondary odontoflow-btn--sm"
          onClick={() => ir(somarDias(data, passo))}
          aria-label={vista === "semana" ? "Próxima semana" : "Próximo dia"}
        >
          ›
        </button>
      </div>

      <p className={s.navegacaoRotulo} aria-live="polite">
        {rotulo}
      </p>

      <div className={s.navegacaoGrupo}>
        <label className={s.navegacaoData}>
          <span className="sr-only">Escolher data</span>
          <input
            type="date"
            className={s.navegacaoInput}
            value={data}
            onChange={(e) => {
              if (e.target.value) ir(e.target.value);
            }}
          />
        </label>

        <div className={s.navegacaoAbas} role="group" aria-label="Visualização">
          <button
            type="button"
            className={`odontoflow-btn odontoflow-btn--sm ${
              vista === "dia" ? "odontoflow-btn--primary" : "odontoflow-btn--ghost"
            }`}
            onClick={() => ir(data, "dia")}
            aria-pressed={vista === "dia"}
          >
            Dia
          </button>
          <button
            type="button"
            className={`odontoflow-btn odontoflow-btn--sm ${
              vista === "semana" ? "odontoflow-btn--primary" : "odontoflow-btn--ghost"
            }`}
            onClick={() => ir(data, "semana")}
            aria-pressed={vista === "semana"}
          >
            Semana
          </button>
        </div>
      </div>
    </div>
  );
}
