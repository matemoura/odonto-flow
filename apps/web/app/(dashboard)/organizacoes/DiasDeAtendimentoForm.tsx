"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import type { SchedulingSettings } from "../../../lib/api";
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

/** Mesmos limites do DTO da API — a tela não deve ser mais restrita que ela. */
const DURACAO_MIN = 5;
const DURACAO_MAX = 480;

/**
 * A API fala em minutos desde a meia-noite; o <input type="time"> fala "HH:mm".
 * A conversão vive só aqui, na borda — o resto do sistema nunca vê string de
 * horário.
 */
function paraHora(minutos: number) {
  return `${String(Math.floor(minutos / 60)).padStart(2, "0")}:${String(minutos % 60).padStart(2, "0")}`;
}
function paraMinutos(hora: string) {
  const [hh, mm] = hora.split(":").map(Number);
  return hh * 60 + mm;
}

/**
 * Horários sugeridos quando o turno é religado. A API guarda turno desligado
 * como janela de tamanho zero, então o valor salvo não serve para repopular os
 * campos — sem isso, ligar a tarde traria "12:00 às 12:00" e o usuário teria de
 * adivinhar o que fazer.
 */
const SUGESTAO = { manhaInicio: "08:00", manhaFim: "12:00", tardeInicio: "13:00", tardeFim: "18:00" };

export function DiasDeAtendimentoForm({ settings }: { settings: SchedulingSettings }) {
  const router = useRouter();
  const [dias, setDias] = useState<number[]>(settings.workingWeekdays);

  // Janela de tamanho zero no banco significa turno desligado.
  const manhaSalva = settings.morningEndMinutes > settings.morningStartMinutes;
  const tardeSalva = settings.afternoonEndMinutes > settings.afternoonStartMinutes;

  const [temManha, setTemManha] = useState(manhaSalva);
  const [temTarde, setTemTarde] = useState(tardeSalva);
  const [manhaInicio, setManhaInicio] = useState(
    manhaSalva ? paraHora(settings.morningStartMinutes) : SUGESTAO.manhaInicio,
  );
  const [manhaFim, setManhaFim] = useState(
    manhaSalva ? paraHora(settings.morningEndMinutes) : SUGESTAO.manhaFim,
  );
  const [tardeInicio, setTardeInicio] = useState(
    tardeSalva ? paraHora(settings.afternoonStartMinutes) : SUGESTAO.tardeInicio,
  );
  const [tardeFim, setTardeFim] = useState(
    tardeSalva ? paraHora(settings.afternoonEndMinutes) : SUGESTAO.tardeFim,
  );
  const [duracao, setDuracao] = useState(settings.slotDurationMinutes);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);
  const [salvando, setSalvando] = useState(false);

  function limparAviso() {
    setSucesso(false);
    setErro(null);
  }

  function alternar(valor: number) {
    limparAviso();
    setDias((atual) =>
      atual.includes(valor) ? atual.filter((d) => d !== valor) : [...atual, valor].sort((a, b) => a - b),
    );
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErro(null);
    setSucesso(false);

    // As mesmas regras da API, verificadas antes de enviar: "salvei e a agenda
    // ficou vazia" é muito mais difícil de entender do que o aviso aqui.
    if (dias.length === 0) {
      setErro("Escolha ao menos um dia de atendimento.");
      return;
    }
    if (!temManha && !temTarde) {
      setErro("Ligue ao menos um turno: manhã, tarde ou os dois.");
      return;
    }

    // Turno desligado vira janela de tamanho zero — é como a API representa
    // "não atendo neste período".
    const ms = temManha ? paraMinutos(manhaInicio) : paraMinutos(manhaInicio);
    const me = temManha ? paraMinutos(manhaFim) : ms;
    const ts = temTarde ? paraMinutos(tardeInicio) : Math.max(me, paraMinutos(tardeInicio));
    const te = temTarde ? paraMinutos(tardeFim) : ts;

    if (!(ms <= me && me <= ts && ts <= te)) {
      setErro("Confira os horários: a tarde precisa começar depois que a manhã termina.");
      return;
    }
    if (duracao < DURACAO_MIN || duracao > DURACAO_MAX) {
      setErro(`A duração precisa ficar entre ${DURACAO_MIN} e ${DURACAO_MAX} minutos.`);
      return;
    }
    if ((temManha && me - ms < duracao) || (temTarde && te - ts < duracao)) {
      setErro("Um dos turnos é menor que uma consulta. Aumente o período ou diminua a duração.");
      return;
    }

    setSalvando(true);
    try {
      const res = await fetch("/api/staff/scheduling/settings", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          workingWeekdays: dias,
          morningStartMinutes: ms,
          morningEndMinutes: me,
          afternoonStartMinutes: ts,
          afternoonEndMinutes: te,
          slotDurationMinutes: duracao,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          Array.isArray(data.message) ? data.message[0] : (data.message ?? "Não foi possível salvar."),
        );
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
      {sucesso ? <p className={s.sucesso}>Agenda da clínica salva.</p> : null}

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

      {/* Um bloco por turno, cada um com seu interruptor. Os campos de hora
          somem quando o turno está desligado: campo desabilitado à vista só
          sugere que dá para preencher. */}
      <div className={s.turnos}>
        <div className={s.turno}>
          <label className={s.turnoChave}>
            <input
              type="checkbox"
              checked={temManha}
              onChange={(e) => {
                limparAviso();
                setTemManha(e.target.checked);
              }}
            />
            Atende de manhã
          </label>
          {temManha ? (
            <div className={s.turnoHoras}>
              <div className={s.campo}>
                <label className={s.rotuloCampo} htmlFor="manha-inicio">
                  Abre
                </label>
                <input
                  id="manha-inicio"
                  type="time"
                  className={s.input}
                  value={manhaInicio}
                  onChange={(e) => {
                    limparAviso();
                    setManhaInicio(e.target.value);
                  }}
                  required
                />
              </div>
              <div className={s.campo}>
                <label className={s.rotuloCampo} htmlFor="manha-fim">
                  Fecha
                </label>
                <input
                  id="manha-fim"
                  type="time"
                  className={s.input}
                  value={manhaFim}
                  onChange={(e) => {
                    limparAviso();
                    setManhaFim(e.target.value);
                  }}
                  required
                />
              </div>
            </div>
          ) : null}
        </div>

        <div className={s.turno}>
          <label className={s.turnoChave}>
            <input
              type="checkbox"
              checked={temTarde}
              onChange={(e) => {
                limparAviso();
                setTemTarde(e.target.checked);
              }}
            />
            Atende à tarde
          </label>
          {temTarde ? (
            <div className={s.turnoHoras}>
              <div className={s.campo}>
                <label className={s.rotuloCampo} htmlFor="tarde-inicio">
                  Abre
                </label>
                <input
                  id="tarde-inicio"
                  type="time"
                  className={s.input}
                  value={tardeInicio}
                  onChange={(e) => {
                    limparAviso();
                    setTardeInicio(e.target.value);
                  }}
                  required
                />
              </div>
              <div className={s.campo}>
                <label className={s.rotuloCampo} htmlFor="tarde-fim">
                  Fecha
                </label>
                <input
                  id="tarde-fim"
                  type="time"
                  className={s.input}
                  value={tardeFim}
                  onChange={(e) => {
                    limparAviso();
                    setTardeFim(e.target.value);
                  }}
                  required
                />
              </div>
            </div>
          ) : null}
        </div>

        <div className={`${s.turno} ${s.campo}`}>
          <label className={s.rotuloCampo} htmlFor="duracao">
            Duração de cada consulta (min)
          </label>
          {/* Campo livre, não uma lista de opções: a API aceita qualquer valor
              entre 5 e 480 minutos, e uma clínica que atende em 25 ou 50 não
              deveria esbarrar numa lista que eu escolhi. */}
          <input
            id="duracao"
            type="number"
            className={s.input}
            min={DURACAO_MIN}
            max={DURACAO_MAX}
            step={5}
            value={duracao}
            onChange={(e) => {
              limparAviso();
              setDuracao(Number(e.target.value));
            }}
            required
          />
        </div>
      </div>

      <p className={s.dica}>
        Vale para a agenda interna e para o link público. Clínica que atende só um turno desliga o
        outro; quem não para para o almoço coloca a tarde começando na hora em que a manhã termina.
      </p>

      <button
        type="submit"
        className="odontoflow-btn odontoflow-btn--primary"
        disabled={salvando}
        aria-disabled={salvando}
      >
        {salvando ? "Salvando…" : "Salvar agenda"}
      </button>
    </form>
  );
}
