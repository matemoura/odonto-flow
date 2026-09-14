"use client";

import { useEffect, useState } from "react";
import type { AgendaAppointment } from "../../../lib/api";
import { AgoraAcoes } from "./AgoraAcoes";
import { toHHmm } from "./agenda-data";
import s from "./agenda.module.css";

/**
 * A ilha do atendimento: fica pequena quando o consultório está vazio e se
 * abre quando alguém está na cadeira.
 *
 * O dia de uma clínica é feito de silêncio longo com momentos agudos no meio —
 * o componente segue esse ritmo em vez de ocupar o mesmo espaço o tempo todo.
 *
 * Expandida, ela mostra o que resta do horário marcado, drenando. É o
 * instrumento desta casa: o slot de 40 minutos. Quando estoura, vira ameixa e
 * diz que passou — que é a informação que a recepção precisa notar sozinha.
 */
export function IlhaAtendimento({
  emAndamento,
  proxima,
  timezone,
}: {
  emAndamento: AgendaAppointment | null;
  proxima: AgendaAppointment | null;
  timezone: string;
}) {
  // `null` até o primeiro efeito no cliente. O servidor não pode calcular
  // "agora": o HTML renderizado lá teria um horário diferente do que o
  // navegador calcula ao hidratar, e o React acusaria divergência.
  const [agora, setAgora] = useState<number | null>(null);

  useEffect(() => {
    setAgora(Date.now());
    // 10s: a barra é um indicador grosso e o texto fala em minutos. Re-render
    // a cada segundo num painel que fica aberto o dia todo não paga o custo.
    const id = setInterval(() => setAgora(Date.now()), 10_000);
    return () => clearInterval(id);
  }, []);

  if (!emAndamento) {
    return (
      <section className={`${s.ilha} ${s.ilhaVazia}`} aria-live="polite">
        <span className={s.ilhaPonto} aria-hidden="true" />
        <p className={s.ilhaVaziaTexto}>
          Consultório livre
          {proxima ? (
            <>
              {" · "}
              <strong className={s.ilhaVaziaProxima}>
                {toHHmm(proxima.startAt, timezone)} {proxima.patient.name}
              </strong>
            </>
          ) : (
            " pelo resto do dia"
          )}
        </p>
      </section>
    );
  }

  const inicio = new Date(emAndamento.startAt).getTime();
  const fim = new Date(emAndamento.endAt).getTime();
  const duracao = Math.max(fim - inicio, 1);

  // Antes do primeiro tick mostra o horário cheio, nunca um valor chutado.
  const decorrido = agora === null ? 0 : agora - inicio;
  const restanteMs = duracao - decorrido;
  const estourou = restanteMs < 0;
  const restanteMin = Math.max(Math.ceil(Math.abs(restanteMs) / 60_000), 0);
  const preenchido = Math.min(Math.max(decorrido / duracao, 0), 1);

  return (
    <section
      className={`${s.ilha} ${s.ilhaAberta} ${estourou ? s.ilhaEstourada : ""}`}
      aria-live="polite"
      aria-label="Atendimento em andamento"
    >
      <div className={s.ilhaTopo}>
        <span className={s.ilhaPonto} aria-hidden="true" />
        <span className={s.ilhaRotulo}>Na cadeira agora</span>
        <span className={s.ilhaRelogio}>
          {agora === null
            ? `${Math.round(duracao / 60_000)} min`
            : estourou
              ? `${restanteMin} min a mais`
              : `faltam ${restanteMin} min`}
        </span>
      </div>

      {/* Logo abaixo do número que ela representa: barra e "faltam 26 min" são o
          mesmo dado, e separados um do outro a barra vira régua divisória. */}
      <div className={s.ilhaBarra} aria-hidden="true">
        <span className={s.ilhaBarraCheia} style={{ transform: `scaleX(${estourou ? 1 : preenchido})` }} />
      </div>

      <div className={s.ilhaCorpo}>
        <span className="hora-display">{toHHmm(emAndamento.startAt, timezone)}</span>
        <div className={s.ilhaPessoa}>
          <strong className={s.ilhaNome}>{emAndamento.patient.name}</strong>
          <p className={s.ilhaDetalhe}>com {emAndamento.professional.user.name}</p>
        </div>
      </div>

      <div className={s.ilhaAcoes}>
        <AgoraAcoes
          appointmentId={emAndamento.id}
          patientId={emAndamento.patient.id}
          currentStatus={emAndamento.status}
        />
      </div>
    </section>
  );
}
