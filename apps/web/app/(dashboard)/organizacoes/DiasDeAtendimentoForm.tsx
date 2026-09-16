"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import s from "../admin.module.css";

/** Índices batem com `Date#getDay()`: 0 = domingo … 6 = sábado. */
const DIAS = [
  { valor: 1, nome: "Segunda" },
  { valor: 2, nome: "Terça" },
  { valor: 3, nome: "Quarta" },
  { valor: 4, nome: "Quinta" },
  { valor: 5, nome: "Sexta" },
  { valor: 6, nome: "Sábado" },
  { valor: 0, nome: "Domingo" },
];

export function DiasDeAtendimentoForm({ workingWeekdays }: { workingWeekdays: number[] }) {
  const router = useRouter();
  const [dias, setDias] = useState<number[]>(workingWeekdays);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);
  const [salvando, setSalvando] = useState(false);

  function alternar(valor: number) {
    setSucesso(false);
    setDias((atual) =>
      atual.includes(valor) ? atual.filter((d) => d !== valor) : [...atual, valor].sort((a, b) => a - b),
    );
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErro(null);
    setSucesso(false);

    // Barra aqui também, além da API: "salvei e não mudou nada" é pior de
    // entender do que o aviso aparecendo antes de enviar.
    if (dias.length === 0) {
      setErro("Escolha ao menos um dia de atendimento.");
      return;
    }

    setSalvando(true);
    try {
      const res = await fetch("/api/staff/scheduling/settings", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ workingWeekdays: dias }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? "Não foi possível salvar.");
      }
      setSucesso(true);
      router.refresh();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível salvar.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {erro ? (
        <p className={s.erro} role="alert">
          {erro}
        </p>
      ) : null}
      {sucesso ? <p className={s.sucesso}>Dias de atendimento salvos.</p> : null}

      <fieldset className={s.diasFieldset}>
        <legend className="sr-only">Dias em que a clínica atende</legend>
        {DIAS.map((dia) => {
          const marcado = dias.includes(dia.valor);
          return (
            <label key={dia.valor} className={`${s.diaOpcao} ${marcado ? s.diaOpcaoAtiva : ""}`}>
              <input
                type="checkbox"
                className="sr-only"
                checked={marcado}
                onChange={() => alternar(dia.valor)}
              />
              {dia.nome}
            </label>
          );
        })}
      </fieldset>

      <p className={s.dica}>
        Vale para a agenda interna e para o link público: o paciente só consegue escolher um dia marcado
        aqui. O horário continua 08:00–12:00 e 13:00–18:00, em encaixes de 40 minutos.
      </p>

      <button
        type="submit"
        className="odontoflow-btn odontoflow-btn--primary"
        disabled={salvando}
        aria-disabled={salvando}
      >
        {salvando ? "Salvando…" : "Salvar dias"}
      </button>
    </form>
  );
}
