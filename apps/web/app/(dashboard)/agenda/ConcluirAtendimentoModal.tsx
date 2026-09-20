"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@odontoflow/ui";
import { SignaturePad, type SignaturePadHandle } from "./SignaturePad";
import s from "./agenda.module.css";
import a from "../admin.module.css";

/**
 * Tela de fechamento do atendimento: o dentista escreve o que foi feito e as
 * duas partes assinam na hora, na mesma tela — é o registro que vira
 * prontuário deste atendimento específico (`ClinicalRecord.appointmentId`).
 *
 * Faz duas chamadas em sequência (registro + status). Se a segunda falhar, o
 * registro clínico já foi salvo — não some, só a consulta continua em
 * "Preenchendo ficha" até tentar de novo (append-only: nunca desfazemos o
 * registro para "tentar de novo do zero").
 */
export function ConcluirAtendimentoModal({
  appointmentId,
  patientId,
  onClose,
}: {
  appointmentId: string;
  patientId: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [conteudo, setConteudo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const profissionalRef = useRef<SignaturePadHandle>(null);
  const pacienteRef = useRef<SignaturePadHandle>(null);

  async function handleConcluir() {
    setErro(null);
    if (!conteudo.trim()) {
      setErro("Escreva o que foi feito neste atendimento.");
      return;
    }
    if (profissionalRef.current?.isEmpty()) {
      setErro("Falta a assinatura do profissional.");
      return;
    }
    if (pacienteRef.current?.isEmpty()) {
      setErro("Falta a assinatura do paciente.");
      return;
    }

    setSalvando(true);
    try {
      const registroRes = await fetch("/api/staff/clinical-records/evolucao", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          patientId,
          appointmentId,
          type: "EVOLUTION",
          content: conteudo.trim(),
          professionalSignature: profissionalRef.current!.toDataUrl(),
          patientSignature: pacienteRef.current!.toDataUrl(),
        }),
      });
      if (!registroRes.ok) {
        const data = await registroRes.json().catch(() => ({}));
        throw new Error(
          Array.isArray(data.message) ? data.message[0] : (data.message ?? "Não foi possível registrar o atendimento."),
        );
      }

      const statusRes = await fetch(`/api/agenda/appointments/${appointmentId}/status`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "COMPLETED" }),
      });
      if (!statusRes.ok) {
        throw new Error("O registro foi salvo, mas não deu para concluir a consulta. Tenta de novo.");
      }

      router.refresh();
      onClose();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível concluir o atendimento.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className={s.modalFundo} role="presentation" onClick={onClose}>
      <div
        className={s.modalCartao}
        role="dialog"
        aria-modal="true"
        aria-labelledby="concluir-atendimento-titulo"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="concluir-atendimento-titulo" className={s.modalTitulo}>
          Concluir atendimento
        </h2>
        <p className={a.dica}>
          Registre o que foi feito e colham as duas assinaturas nesta tela antes de concluir. Depois
          de salvo, o registro não pode ser editado nem apagado.
        </p>

        {erro ? (
          <p className={a.erro} role="alert">
            {erro}
          </p>
        ) : null}

        <label className={a.rotuloCampo} htmlFor="concluir-conteudo">
          O que foi feito
        </label>
        <textarea
          id="concluir-conteudo"
          className={a.input}
          style={{ minHeight: 100, padding: "10px 14px", lineHeight: 1.5 }}
          value={conteudo}
          onChange={(event) => {
            setErro(null);
            setConteudo(event.target.value);
          }}
          placeholder="Ex.: Restauração em resina no 26, face oclusal. Anestesia com lidocaína 2%. Paciente sem intercorrências."
          disabled={salvando}
        />

        <div className={s.assinaturasGrade}>
          <div>
            <span className={a.rotuloCampo}>Assinatura do profissional</span>
            <SignaturePad ref={profissionalRef} />
          </div>
          <div>
            <span className={a.rotuloCampo}>Assinatura do paciente</span>
            <SignaturePad ref={pacienteRef} />
          </div>
        </div>

        <div className={a.acoes}>
          <Button
            type="button"
            variant="primary"
            className="odontoflow-btn--sm"
            onClick={handleConcluir}
            disabled={salvando}
            aria-disabled={salvando}
          >
            {salvando ? "Salvando…" : "Concluir atendimento"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="odontoflow-btn--sm"
            onClick={onClose}
            disabled={salvando}
          >
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  );
}
