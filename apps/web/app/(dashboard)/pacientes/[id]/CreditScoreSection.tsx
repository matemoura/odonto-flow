"use client";

import { FormEvent, useState } from "react";
import { Button } from "@odontoflow/ui";
import type { CreditScoreQuery } from "../../../../lib/api";
import s from "../../admin.module.css";
import { formatarData } from "../../../../lib/datas";
import { useFusoDaClinica } from "../../FusoDaClinica";

const RISK_LABEL: Record<string, string> = { low: "baixo risco", medium: "risco médio", high: "alto risco" };

export function CreditScoreSection({ patientId, initial }: { patientId: string; initial: CreditScoreQuery }) {
  const fuso = useFusoDaClinica();
  const [result, setResult] = useState(initial);
  const [consent, setConsent] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      const res = await fetch(`/api/staff/patients/${patientId}/credit-score`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ consent }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Não foi possível consultar.");
      setResult(data);
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível consultar.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section className={s.bloco}>
      <h2 style={{ fontSize: 14, fontWeight: 600 }}>Consulta de crédito</h2>
      <p style={{ fontSize: 12, color: "var(--tinta-55)" }}>
        Score mock (não é um score de crédito real) — plugue um provedor pago em Integrações quando quiser um de
        verdade.
      </p>
      {result ? (
        <p style={{ fontSize: 13 }}>
          Última consulta: <strong>{result.score}</strong> ({RISK_LABEL[result.riskBand]}) em{" "}
          {formatarData(result.queriedAt, fuso)}
        </p>
      ) : (
        <p style={{ fontSize: 12, color: "var(--tinta-55)" }}>Nenhuma consulta feita ainda.</p>
      )}
      {erro ? (
        <p className={s.erro} role="alert">
          {erro}
        </p>
      ) : null}
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <label style={{ display: "flex", gap: 8, fontSize: 12.5, alignItems: "flex-start" }}>
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          O paciente autorizou esta consulta de score agora.
        </label>
        <Button type="submit" variant="secondary" disabled={enviando || !consent} style={{ alignSelf: "flex-start" }}>
          {enviando ? "Consultando…" : "Consultar score"}
        </Button>
      </form>
    </section>
  );
}
