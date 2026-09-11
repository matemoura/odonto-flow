"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@odontoflow/ui";
import type { AppointmentStatus } from "../../../lib/api";

/** Não tem ação de início pra consulta já concluída/cancelada/que não aconteceu. */
const SEM_ACAO_DE_INICIO: AppointmentStatus[] = ["COMPLETED", "CANCELLED", "NO_SHOW"];

export function AgoraAcoes({
  appointmentId,
  patientId,
  currentStatus,
}: {
  appointmentId: string;
  patientId: string;
  currentStatus: AppointmentStatus;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  const jaEmFicha = currentStatus === "FILLING_FORM";
  const proximoStatus: AppointmentStatus = jaEmFicha ? "COMPLETED" : "FILLING_FORM";
  const rotulo = jaEmFicha ? "Concluir atendimento" : "Iniciar atendimento";

  function handleClick() {
    setErro(null);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/agenda/appointments/${appointmentId}/status`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ status: proximoStatus }),
        });
        if (!res.ok) throw new Error();
        router.refresh();
      } catch {
        setErro("Não deu para atualizar. Tenta de novo.");
      }
    });
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 10 }}>
        {SEM_ACAO_DE_INICIO.includes(currentStatus) ? null : (
          <Button variant="primary" onClick={handleClick} disabled={isPending} aria-disabled={isPending}>
            {isPending ? "…" : rotulo}
          </Button>
        )}
        <Link href={`/pacientes/${patientId}`} className="odontoflow-btn odontoflow-btn--ghost">
          Abrir ficha
        </Link>
      </div>
      {erro ? <p style={{ marginTop: 6, fontSize: 11, color: "var(--ameixa)" }}>{erro}</p> : null}
    </div>
  );
}
