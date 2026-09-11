"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@odontoflow/ui";
import type { IntegrationKind } from "../../../lib/api";
import s from "../admin.module.css";

const KIND_INFO: Record<IntegrationKind, { label: string; realOptions: string }> = {
  WHATSAPP: { label: "WhatsApp (confirmação, Secretária IA)", realOptions: "meta-cloud-api, 360dialog, zenvia, twilio" },
  AI_ASSISTANT: { label: "IA (Secretária IA / Copiloto)", realOptions: "claude, openai, gemini" },
  NFE: { label: "Emissão de NFS-e", realOptions: "focus-nfe, nfeio, enotas" },
  E_SIGNATURE: { label: "Assinatura eletrônica", realOptions: "autentique, clicksign, d4sign" },
  CREDIT_SCORE: { label: "Consulta de score de crédito", realOptions: "serasa, boavista" },
};

export function IntegrationRow({
  kind,
  providerName,
  enabled,
}: {
  kind: IntegrationKind;
  providerName: string;
  enabled: boolean;
}) {
  const router = useRouter();
  const info = KIND_INFO[kind];
  const [value, setValue] = useState(providerName);
  const [ativa, setAtiva] = useState(enabled);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErro(null);
    setSucesso(false);
    setEnviando(true);
    try {
      const res = await fetch(`/api/staff/integrations/${kind}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ providerName: value, enabled: ativa }),
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
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ padding: "14px 16px", background: "var(--gaze)", borderRadius: "var(--r-md)", display: "flex", flexDirection: "column", gap: 8 }}>
      <strong style={{ fontSize: 13.5 }}>{info.label}</strong>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <input
          className={s.input}
          style={{ maxWidth: 220 }}
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5 }}>
          <input type="checkbox" checked={ativa} onChange={(e) => setAtiva(e.target.checked)} />
          Ativa
        </label>
        {value === "mock" ? (
          <span className="chip chip--estatico">grátis</span>
        ) : (
          <span className="chip chip--estatico chip--alerta">ainda não implementado</span>
        )}
        <Button type="submit" variant="secondary" className="odontoflow-btn--sm" disabled={enviando}>
          {enviando ? "…" : "Salvar"}
        </Button>
      </div>
      <span style={{ fontSize: 11.5, color: "var(--tinta-55)" }}>Provedores reais possíveis: {info.realOptions}</span>
      {erro ? <span style={{ fontSize: 11.5, color: "var(--ameixa)" }}>{erro}</span> : null}
      {sucesso ? <span style={{ fontSize: 11.5, color: "#38715c" }}>Salvo.</span> : null}
    </form>
  );
}
