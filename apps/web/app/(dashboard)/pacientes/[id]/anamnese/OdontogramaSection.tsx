"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@odontoflow/ui";
import { TOOTH_ROWS, TOOTH_CONDITION_LABEL, type OdontogramEntry, type ToothCondition } from "../../../../../lib/api";
import s from "../../../admin.module.css";

const CONDITION_COLOR: Record<ToothCondition, string> = {
  HEALTHY: "var(--gaze)",
  CARIES: "var(--ameixa-suave)",
  RESTORED: "var(--menta)",
  MISSING: "var(--linha)",
  CROWN: "var(--areia)",
  IMPLANT: "var(--areia)",
  ROOT_CANAL: "var(--ameixa-suave)",
  EXTRACTION_INDICATED: "var(--ameixa-suave)",
};

export function OdontogramaSection({ patientId, entries }: { patientId: string; entries: OdontogramEntry[] }) {
  const router = useRouter();
  const byTooth = new Map(entries.map((e) => [e.toothNumber, e]));
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);
  const [condition, setCondition] = useState<ToothCondition>("HEALTHY");
  const [faces, setFaces] = useState("");
  const [notes, setNotes] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  function selecionar(tooth: number) {
    setSelectedTooth(tooth);
    const existing = byTooth.get(tooth);
    setCondition(existing?.condition ?? "HEALTHY");
    setFaces(existing?.faces ?? "");
    setNotes(existing?.notes ?? "");
    setErro(null);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!selectedTooth) return;
    setErro(null);
    setSalvando(true);
    try {
      const res = await fetch("/api/staff/clinical-records/odontogram", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          patientId,
          toothNumber: selectedTooth,
          condition,
          faces: faces || undefined,
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
          <div key={i} style={{ display: "flex", gap: 4 }}>
            {row.map((tooth) => {
              const entry = byTooth.get(tooth);
              return (
                <button
                  key={tooth}
                  type="button"
                  onClick={() => selecionar(tooth)}
                  title={entry ? TOOTH_CONDITION_LABEL[entry.condition] : "Saudável (sem registro)"}
                  style={{
                    minWidth: 34,
                    height: 34,
                    borderRadius: "var(--r-sm)",
                    border: selectedTooth === tooth ? "2px solid var(--consultorio)" : "1px solid var(--linha-forte)",
                    background: entry ? CONDITION_COLOR[entry.condition] : "var(--branco)",
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {tooth}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {selectedTooth ? (
        <form onSubmit={handleSubmit} className={s.form} style={{ maxWidth: 420 }}>
          <strong style={{ fontSize: 13 }}>Dente {selectedTooth}</strong>
          {erro ? (
            <p className={s.erro} role="alert">
              {erro}
            </p>
          ) : null}
          <div className={s.campo}>
            <label className={s.rotuloCampo}>Condição</label>
            <select className={s.input} value={condition} onChange={(e) => setCondition(e.target.value as ToothCondition)}>
              {Object.entries(TOOTH_CONDITION_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className={s.campo}>
            <label className={s.rotuloCampo}>Faces acometidas</label>
            <input className={s.input} value={faces} onChange={(e) => setFaces(e.target.value)} placeholder="ex.: mesial, oclusal" />
          </div>
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
        <p className={s.vazio}>Clique num dente pra registrar a condição.</p>
      )}
    </div>
  );
}
