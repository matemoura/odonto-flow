"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@odontoflow/ui";
import type { AppointmentStatus } from "../../../lib/api";

/**
 * Um botão só, com a próxima ação do fluxo do dia — nunca um seletor de
 * status livre. SCHEDULED → CONFIRMED → WAITING (chegou) → FILLING_FORM
 * (preenchendo a ficha) → COMPLETED. NO_SHOW tem a única saída (remarcar).
 * COMPLETED/CANCELLED não têm próxima ação — não renderiza nada.
 */
const PROXIMA_ACAO: Partial<Record<AppointmentStatus, { rotulo: string; proximoStatus: AppointmentStatus; perigo?: boolean }>> = {
  SCHEDULED: { rotulo: "Confirmar", proximoStatus: "CONFIRMED" },
  CONFIRMED: { rotulo: "Chegou", proximoStatus: "WAITING" },
  WAITING: { rotulo: "Iniciar ficha", proximoStatus: "FILLING_FORM" },
  FILLING_FORM: { rotulo: "Concluir atendimento", proximoStatus: "COMPLETED" },
  NO_SHOW: { rotulo: "Remarcar", proximoStatus: "SCHEDULED", perigo: true },
};

export function AppointmentStatusButton({
  appointmentId,
  currentStatus,
}: {
  appointmentId: string;
  currentStatus: AppointmentStatus;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  const acao = PROXIMA_ACAO[currentStatus];

  function handleClick() {
    if (!acao) return;
    setErro(null);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/agenda/appointments/${appointmentId}/status`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ status: acao.proximoStatus }),
        });
        if (!res.ok) throw new Error();
        router.refresh();
      } catch {
        setErro("Não deu para atualizar. Tenta de novo.");
      }
    });
  }

  if (!acao) return null;

  return (
    <span>
      <Button
        variant={acao.perigo ? "primary" : "secondary"}
        className={`odontoflow-btn--sm${acao.perigo ? " odontoflow-btn--perigo" : ""}`}
        onClick={handleClick}
        disabled={isPending}
        aria-disabled={isPending}
      >
        {isPending ? "…" : acao.rotulo}
      </Button>
      {erro ? <span style={{ display: "block", fontSize: 11, color: "var(--ameixa)" }}>{erro}</span> : null}
    </span>
  );
}
