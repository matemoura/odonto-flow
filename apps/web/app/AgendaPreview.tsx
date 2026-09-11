"use client";

import { ReactNode, useState } from "react";
import s from "./home.module.css";

type SlotState = "livre" | "ocupado" | "reservado";

interface Slot {
  time: string;
  state: SlotState;
  procedure?: string;
  professional?: string;
}

const INITIAL_SLOTS: Slot[] = [
  { time: "08:00", state: "livre" },
  { time: "08:40", state: "ocupado", procedure: "Avaliação", professional: "C.V." },
  { time: "09:20", state: "livre" },
  { time: "10:00", state: "ocupado", procedure: "Restauração", professional: "A.P." },
  { time: "10:40", state: "livre" },
  { time: "11:20", state: "livre" },
  { time: "13:00", state: "ocupado", procedure: "Canal", professional: "A.P." },
  { time: "13:40", state: "livre" },
  { time: "14:20", state: "livre" },
  { time: "15:00", state: "ocupado", procedure: "Limpeza", professional: "C.V." },
  { time: "15:40", state: "livre" },
  { time: "16:20", state: "ocupado", procedure: "Alinhador", professional: "A.P." },
  { time: "17:00", state: "livre" },
  { time: "17:40", state: "livre" },
];

/** Índice (dentro de INITIAL_SLOTS) depois do qual o marcador "agora" aparece. */
const AGORA_APOS_INDICE = 4;

const RESERVAS_DEMO = [
  { procedure: "Avaliação", professional: "C.V." },
  { procedure: "Limpeza", professional: "A.P." },
  { procedure: "Restauração", professional: "A.P." },
  { procedure: "Canal", professional: "C.V." },
  { procedure: "Alinhador", professional: "A.P." },
];

export function AgendaPreview() {
  const [slots, setSlots] = useState(INITIAL_SLOTS);

  function alternar(index: number) {
    setSlots((atual) =>
      atual.map((slot, i) => {
        if (i !== index || slot.state === "ocupado") return slot;
        if (slot.state === "reservado") {
          return { time: slot.time, state: "livre" };
        }
        const demo = RESERVAS_DEMO[index % RESERVAS_DEMO.length];
        return { ...slot, ...demo, state: "reservado" };
      }),
    );
  }

  const livres = slots.filter((slot) => slot.state === "livre").length;

  return (
    <div className={`arco arco--alto ${s.previaEnvelope}`}>
      <div className={s.previaCabecalho}>
        <span className={s.previaTitulo}>Um dia comum de agenda odontológica</span>
        <span className={s.previaContador} aria-live="polite">
          {livres} {livres === 1 ? "horário livre" : "horários livres"}
        </span>
      </div>

      <div className={s.faixa} role="group" aria-label="Horários do dia">
        {slots.reduce<ReactNode[]>((nodes, slot, index) => {
          nodes.push(<SlotButton key={slot.time} slot={slot} onClick={() => alternar(index)} />);
          if (index === AGORA_APOS_INDICE) {
            nodes.push(
              <div className={s.agora} key="agora" aria-hidden="true">
                <span className={s.agoraPonto} />
                <span className={s.agoraLinha} />
                <span className={s.agoraRotulo}>agora</span>
              </div>,
            );
          }
          return nodes;
        }, [])}
      </div>

      <p className={s.dica}>Clique num horário livre pra reservar — clique de novo pra liberar.</p>
    </div>
  );
}

function SlotButton({ slot, onClick }: { slot: Slot; onClick: () => void }) {
  const classe = [
    s.slot,
    slot.state === "ocupado" ? s.slotOcupado : "",
    slot.state === "reservado" ? s.slotReservado : "",
  ]
    .filter(Boolean)
    .join(" ");

  const rotulo =
    slot.state === "ocupado"
      ? `${slot.time}, ocupado — ${slot.procedure} com ${slot.professional}`
      : slot.state === "reservado"
        ? `${slot.time}, reservado nesta prévia — ${slot.procedure}. Clique para liberar.`
        : `${slot.time}, livre. Clique para reservar nesta prévia.`;

  return (
    <button
      type="button"
      className={classe}
      disabled={slot.state === "ocupado"}
      aria-pressed={slot.state === "reservado"}
      aria-label={rotulo}
      onClick={onClick}
    >
      <span className={s.slotHora}>{slot.time}</span>
      {slot.state !== "livre" ? (
        <span className={s.slotDetalhe} aria-hidden="true">
          {slot.professional}
        </span>
      ) : null}
    </button>
  );
}
