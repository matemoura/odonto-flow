"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AppointmentLabel } from "../../../lib/api";
import s from "./agenda.module.css";

/** Preto ou branco, o que der mais contraste sobre `hex` (fórmula de luminância relativa simplificada). */
function corDeTextoLegivel(hex: string): string {
  const valor = hex.replace("#", "");
  const r = parseInt(valor.substring(0, 2), 16);
  const g = parseInt(valor.substring(2, 4), 16);
  const b = parseInt(valor.substring(4, 6), 16);
  const luminancia = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminancia > 0.6 ? "#1a1a1a" : "#ffffff";
}

/**
 * Um `<select>` só, cuja própria cor de fundo é a do rótulo atual — dá pra ver
 * o rótulo sem abrir nada, e trocar é só escolher outra opção. Sem rótulo
 * nenhum, fica neutro (fundo da página) em vez de sumir, pra não pular o
 * layout quando alguém aplica o primeiro rótulo do dia.
 */
export function SeletorDeRotulo({
  appointmentId,
  currentLabelId,
  labels,
}: {
  appointmentId: string;
  currentLabelId: string | null;
  labels: AppointmentLabel[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [valor, setValor] = useState(currentLabelId ?? "");
  const [erro, setErro] = useState<string | null>(null);

  const selecionado = labels.find((l) => l.id === valor);

  function handleChange(novoValor: string) {
    setValor(novoValor);
    setErro(null);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/agenda/appointments/${appointmentId}/label`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ labelId: novoValor || null }),
        });
        if (!res.ok) throw new Error();
        router.refresh();
      } catch {
        setValor(currentLabelId ?? "");
        setErro("Falha ao aplicar o rótulo.");
      }
    });
  }

  if (labels.length === 0) return null;

  return (
    <span style={{ display: "inline-flex", flexDirection: "column", gap: 2 }}>
      <select
        className={s.rotuloSelect}
        value={valor}
        disabled={isPending}
        onChange={(e) => handleChange(e.target.value)}
        style={{
          background: selecionado ? selecionado.color : "var(--branco)",
          color: selecionado ? corDeTextoLegivel(selecionado.color) : "var(--tinta-70)",
        }}
        aria-label="Rótulo da consulta"
      >
        <option value="">Sem rótulo</option>
        {labels.map((label) => (
          <option key={label.id} value={label.id}>
            {label.name}
          </option>
        ))}
      </select>
      {erro ? <span className={s.erroAcao}>{erro}</span> : null}
    </span>
  );
}
