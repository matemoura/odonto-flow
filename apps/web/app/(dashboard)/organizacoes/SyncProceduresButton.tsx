"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@odontoflow/ui";
import type { OrganizationClinic } from "../../../lib/api";
import s from "../admin.module.css";

export function SyncProceduresButton({
  clinics,
  currentClinicId,
}: {
  clinics: OrganizationClinic[];
  currentClinicId: string;
}) {
  const router = useRouter();
  const [sourceClinicId, setSourceClinicId] = useState(currentClinicId);
  const [erro, setErro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<{ clinic: OrganizationClinic; created: number }[] | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function handleSync() {
    setErro(null);
    setResultado(null);
    setEnviando(true);
    try {
      const res = await fetch("/api/staff/organizations/procedures/sync", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sourceClinicId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message ?? "Não foi possível sincronizar.");
      setResultado(data);
      router.refresh();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível sincronizar.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section style={{ maxWidth: 420, display: "flex", flexDirection: "column", gap: 8 }}>
      <h2 style={{ fontSize: 14, fontWeight: 600 }}>Catálogo compartilhado</h2>
      <p style={{ fontSize: 12, color: "var(--tinta-55)" }}>
        Copia os procedimentos de uma unidade para todas as outras da rede (sem duplicar por nome).
      </p>
      {erro ? (
        <p className={s.erro} role="alert">
          {erro}
        </p>
      ) : null}
      {resultado ? (
        <p className={s.sucesso}>
          {resultado.map((r) => `${r.clinic.name}: +${r.created}`).join(" · ") || "Nada a sincronizar."}
        </p>
      ) : null}
      <div className={s.campo}>
        <label className={s.rotuloCampo}>Unidade de origem</label>
        <select className={s.input} value={sourceClinicId} onChange={(e) => setSourceClinicId(e.target.value)}>
          {clinics.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <Button variant="primary" onClick={handleSync} disabled={enviando} style={{ alignSelf: "flex-start" }}>
        {enviando ? "Sincronizando…" : "Sincronizar catálogo"}
      </Button>
    </section>
  );
}
