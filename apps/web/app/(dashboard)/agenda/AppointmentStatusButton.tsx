"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@odontoflow/ui";
import type { AppointmentStatus } from "../../../lib/api";
import { ConcluirAtendimentoModal } from "./ConcluirAtendimentoModal";
import s from "./agenda.module.css";

/**
 * A ação que leva a consulta ao próximo passo do dia. Um botão só, nunca um
 * seletor de status livre: SCHEDULED → CONFIRMED → WAITING (chegou) →
 * FILLING_FORM (preenchendo a ficha) → COMPLETED.
 */
const PROXIMA_ACAO: Partial<Record<AppointmentStatus, { rotulo: string; proximoStatus: AppointmentStatus }>> = {
  SCHEDULED: { rotulo: "Confirmar", proximoStatus: "CONFIRMED" },
  CONFIRMED: { rotulo: "Chegou", proximoStatus: "WAITING" },
  WAITING: { rotulo: "Iniciar ficha", proximoStatus: "FILLING_FORM" },
  FILLING_FORM: { rotulo: "Concluir atendimento", proximoStatus: "COMPLETED" },
};

/**
 * As saídas do fluxo: o paciente desmarcou, ou não apareceu.
 *
 * Até aqui a recepção não tinha nenhuma das duas — e a consequência não era só
 * ficar sem registro: como cancelada e falta não ocupam horário, sem esses
 * botões o encaixe continuava **bloqueado no link público** depois que o
 * paciente desmarcou. O contador de faltas do dia também vivia zerado.
 *
 * `confirmacao` existe porque as duas ações são difíceis de desfazer: voltar
 * depende de o horário ainda estar livre.
 */
const SAIDAS: Partial<Record<AppointmentStatus, { rotulo: string; status: AppointmentStatus; confirmacao: string }[]>> =
  {
    SCHEDULED: [
      { rotulo: "Não veio", status: "NO_SHOW", confirmacao: "Marcar esta consulta como falta?" },
      { rotulo: "Cancelar", status: "CANCELLED", confirmacao: "Cancelar esta consulta e liberar o horário?" },
    ],
    CONFIRMED: [
      { rotulo: "Não veio", status: "NO_SHOW", confirmacao: "Marcar esta consulta como falta?" },
      { rotulo: "Cancelar", status: "CANCELLED", confirmacao: "Cancelar esta consulta e liberar o horário?" },
    ],
    WAITING: [
      { rotulo: "Cancelar", status: "CANCELLED", confirmacao: "Cancelar esta consulta e liberar o horário?" },
    ],
    FILLING_FORM: [
      { rotulo: "Cancelar", status: "CANCELLED", confirmacao: "Cancelar esta consulta e liberar o horário?" },
    ],
  };

/** Consulta cancelada ou sem comparecimento pode voltar, se o horário ainda estiver livre. */
const REMARCAR: Partial<Record<AppointmentStatus, { rotulo: string; status: AppointmentStatus }>> = {
  NO_SHOW: { rotulo: "Remarcar", status: "SCHEDULED" },
  CANCELLED: { rotulo: "Remarcar", status: "SCHEDULED" },
};

export function AppointmentStatusButton({
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
  const [confirmando, setConfirmando] = useState<AppointmentStatus | null>(null);
  const [concluindo, setConcluindo] = useState(false);

  const avancar = PROXIMA_ACAO[currentStatus];
  const saidas = SAIDAS[currentStatus] ?? [];
  const remarcar = REMARCAR[currentStatus];

  function mudarPara(status: AppointmentStatus) {
    setErro(null);
    setConfirmando(null);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/agenda/appointments/${appointmentId}/status`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ status }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          // A API explica o motivo (horário já ocupado, transição inválida) —
          // repetir "não deu" por cima esconderia a única informação útil.
          throw new Error(data.message ?? "Não deu para atualizar. Tenta de novo.");
        }
        router.refresh();
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Não deu para atualizar. Tenta de novo.");
      }
    });
  }

  if (!avancar && saidas.length === 0 && !remarcar) return null;

  const pedidoDeConfirmacao = saidas.find((saida) => saida.status === confirmando);

  // Concluir exige registrar o que foi feito e colher as duas assinaturas
  // antes — por isso abre a tela dedicada em vez de só trocar o status.
  function handleAvancar() {
    if (!avancar) return;
    if (avancar.proximoStatus === "COMPLETED") {
      setConcluindo(true);
      return;
    }
    mudarPara(avancar.proximoStatus);
  }

  return (
    <div className={s.acoesConsulta}>
      {pedidoDeConfirmacao ? (
        <span className={s.confirmacao} role="alert">
          <span>{pedidoDeConfirmacao.confirmacao}</span>
          <Button
            variant="primary"
            className="odontoflow-btn--sm odontoflow-btn--perigo"
            onClick={() => mudarPara(pedidoDeConfirmacao.status)}
            disabled={isPending}
            aria-disabled={isPending}
          >
            {isPending ? "…" : pedidoDeConfirmacao.rotulo}
          </Button>
          <Button
            variant="ghost"
            className="odontoflow-btn--sm"
            onClick={() => setConfirmando(null)}
            disabled={isPending}
          >
            Voltar
          </Button>
        </span>
      ) : (
        <>
          {avancar ? (
            <Button
              variant="secondary"
              className="odontoflow-btn--sm"
              onClick={handleAvancar}
              disabled={isPending}
              aria-disabled={isPending}
            >
              {isPending ? "…" : avancar.rotulo}
            </Button>
          ) : null}

          {remarcar ? (
            <Button
              variant="secondary"
              className="odontoflow-btn--sm"
              onClick={() => mudarPara(remarcar.status)}
              disabled={isPending}
              aria-disabled={isPending}
            >
              {isPending ? "…" : remarcar.rotulo}
            </Button>
          ) : null}

          {saidas.map((saida) => (
            <Button
              key={saida.status}
              variant="ghost"
              className="odontoflow-btn--sm"
              onClick={() => setConfirmando(saida.status)}
              disabled={isPending}
            >
              {saida.rotulo}
            </Button>
          ))}
        </>
      )}

      {erro ? (
        <span className={s.erroAcao} role="alert">
          {erro}
        </span>
      ) : null}

      {concluindo ? (
        <ConcluirAtendimentoModal
          appointmentId={appointmentId}
          patientId={patientId}
          onClose={() => setConcluindo(false)}
        />
      ) : null}
    </div>
  );
}
