"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@odontoflow/ui";
import { TOOTH_ROWS, type PeriodontalEntry } from "../../../../../lib/api";
import { ToothButton } from "./ToothButton";
import s from "../../../admin.module.css";

function alertaDoDente(entry: PeriodontalEntry | undefined) {
  if (!entry) return false;
  if (entry.bleeding) return true;
  const depths = [
    entry.probingDepthBuccalMesial,
    entry.probingDepthBuccalCentral,
    entry.probingDepthBuccalDistal,
    entry.probingDepthLingualMesial,
    entry.probingDepthLingualCentral,
    entry.probingDepthLingualDistal,
  ];
  return depths.some((d) => d !== null && d !== undefined && d >= 4);
}

const CAMPOS_PROFUNDIDADE: { key: keyof PeriodontalEntry; label: string }[] = [
  { key: "probingDepthBuccalMesial", label: "Vest. mesial" },
  { key: "probingDepthBuccalCentral", label: "Vest. central" },
  { key: "probingDepthBuccalDistal", label: "Vest. distal" },
  { key: "probingDepthLingualMesial", label: "Ling. mesial" },
  { key: "probingDepthLingualCentral", label: "Ling. central" },
  { key: "probingDepthLingualDistal", label: "Ling. distal" },
];

export function PeriogramaSection({ patientId, entries }: { patientId: string; entries: PeriodontalEntry[] }) {
  const router = useRouter();
  const byTooth = new Map(entries.map((e) => [e.toothNumber, e]));
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);
  const [depths, setDepths] = useState<Record<string, number | "">>({});
  const [mobility, setMobility] = useState<number | "">("");
  const [recession, setRecession] = useState<number | "">("");
  const [bleeding, setBleeding] = useState(false);
  const [notes, setNotes] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  function selecionar(tooth: number) {
    setSelectedTooth(tooth);
    const existing = byTooth.get(tooth);
    const nextDepths: Record<string, number | ""> = {};
    for (const campo of CAMPOS_PROFUNDIDADE) {
      const valor = existing?.[campo.key];
      nextDepths[campo.key] = typeof valor === "number" ? valor : "";
    }
    setDepths(nextDepths);
    setMobility(existing?.mobility ?? "");
    setRecession(existing?.recession ?? "");
    setBleeding(existing?.bleeding ?? false);
    setNotes(existing?.notes ?? "");
    setErro(null);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!selectedTooth) return;
    setErro(null);
    setSalvando(true);
    try {
      const res = await fetch("/api/staff/clinical-records/periodontogram", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          patientId,
          toothNumber: selectedTooth,
          ...Object.fromEntries(
            Object.entries(depths).filter(([, v]) => v !== "").map(([k, v]) => [k, v]),
          ),
          mobility: mobility === "" ? undefined : mobility,
          recession: recession === "" ? undefined : recession,
          bleeding,
          notes: notes || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? "Não foi possível salvar.");
      }
      router.refresh();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível salvar.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, overflowX: "auto" }}>
        {TOOTH_ROWS.map((row, i) => (
          <div key={i} style={{ display: "flex", gap: 2 }}>
            {row.map((tooth) => {
              const entry = byTooth.get(tooth);
              const alerta = alertaDoDente(entry);
              return (
                <ToothButton
                  key={tooth}
                  tooth={tooth}
                  invertido={i === 0}
                  selecionado={selectedTooth === tooth}
                  onClick={() => selecionar(tooth)}
                  title={alerta ? "Sondagem ≥4mm ou sangramento" : "Sem alteração registrada"}
                  color={alerta ? "var(--ameixa-suave)" : entry ? "var(--menta)" : "var(--branco)"}
                />
              );
            })}
          </div>
        ))}
      </div>

      {selectedTooth ? (
        <form onSubmit={handleSubmit} className={s.form} style={{ maxWidth: 480 }}>
          <strong style={{ fontSize: 13 }}>Dente {selectedTooth} — sondagem (mm)</strong>
          {erro ? (
            <p className={s.erro} role="alert">
              {erro}
            </p>
          ) : null}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: 10 }}>
            {CAMPOS_PROFUNDIDADE.map((campo) => (
              <div className={s.campo} key={campo.key}>
                <label className={s.rotuloCampo}>{campo.label}</label>
                <input
                  type="number"
                  min={0}
                  className={s.input}
                  value={depths[campo.key] ?? ""}
                  onChange={(e) =>
                    setDepths((prev) => ({ ...prev, [campo.key]: e.target.value === "" ? "" : Number(e.target.value) }))
                  }
                />
              </div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
            <div className={s.campo}>
              <label className={s.rotuloCampo}>Mobilidade (0-3)</label>
              <input
                type="number"
                min={0}
                max={3}
                className={s.input}
                value={mobility}
                onChange={(e) => setMobility(e.target.value === "" ? "" : Number(e.target.value))}
              />
            </div>
            <div className={s.campo}>
              <label className={s.rotuloCampo}>Retração (mm)</label>
              <input
                type="number"
                min={0}
                className={s.input}
                value={recession}
                onChange={(e) => setRecession(e.target.value === "" ? "" : Number(e.target.value))}
              />
            </div>
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
            <input type="checkbox" checked={bleeding} onChange={(e) => setBleeding(e.target.checked)} />
            Sangramento à sondagem
          </label>
          <div className={s.campo}>
            <label className={s.rotuloCampo}>Observações</label>
            <input className={s.input} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div>
            <Button type="submit" variant="primary" disabled={salvando}>
              {salvando ? "Salvando…" : "Salvar dente"}
            </Button>
          </div>
        </form>
      ) : (
        <p className={s.vazio}>Clique num dente pra registrar a sondagem periodontal.</p>
      )}
    </div>
  );
}
