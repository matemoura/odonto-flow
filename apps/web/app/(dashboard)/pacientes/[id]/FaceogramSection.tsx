"use client";

import { ChangeEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@odontoflow/ui";
import type { FacialPlanning } from "../../../../lib/api";
import { FaceogramCanvas, type Stroke } from "./FaceogramCanvas";
import s from "../../admin.module.css";
import { formatarData } from "../../../../lib/datas";
import { useFusoDaClinica } from "../../FusoDaClinica";
import { FalhaAoCarregar } from "./FalhaAoCarregar";

export function FaceogramSection({ patientId, plannings }: { patientId: string; plannings: FacialPlanning[] | null }) {
  const fuso = useFusoDaClinica();
  const router = useRouter();
  const versoes = plannings ?? [];
  const latest = versoes[0] ?? null;
  const [viewing, setViewing] = useState<FacialPlanning | null>(null);
  const [pendingDocumentId, setPendingDocumentId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setErro(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("patientId", patientId);
      formData.append("type", "PHOTO");
      const res = await fetch("/api/staff/documents", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Falha ao enviar a foto.");
      setPendingDocumentId(data.id);
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Falha ao enviar a foto.");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  async function handleSave(strokes: Stroke[]) {
    const documentId = pendingDocumentId ?? latest?.document.id;
    if (!documentId) return;
    setSaving(true);
    setErro(null);
    try {
      const res = await fetch("/api/staff/faceogram", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ patientId, documentId, overlayData: strokes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Falha ao salvar.");
      setPendingDocumentId(null);
      router.refresh();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Falha ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  const activeDocumentId = pendingDocumentId ?? latest?.document.id ?? null;
  const initialStrokes = pendingDocumentId ? [] : ((latest?.overlayData as Stroke[]) ?? []);

  return (
    <section className={s.bloco}>
      <h2 style={{ fontSize: 14, fontWeight: 600 }}>Faceograma</h2>
      <p style={{ fontSize: 12, color: "var(--tinta-55)" }}>
        Planejamento estético (HOF) sobre uma foto do paciente — cada análise salva cria uma nova versão.
      </p>

      {erro ? (
        <p className={s.erro} role="alert">
          {erro}
        </p>
      ) : null}

      {versoes.length > 0 ? (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {versoes.map((p) => (
            <Button
              key={p.id}
              variant={viewing?.id === p.id ? "primary" : "ghost"}
              className="odontoflow-btn--sm"
              onClick={() => setViewing(viewing?.id === p.id ? null : p)}
            >
              Versão {p.version} ({formatarData(p.createdAt, fuso)})
            </Button>
          ))}
        </div>
      ) : null}

      {viewing ? (
        <FaceogramCanvas
          imageUrl={`/api/staff/documents/${viewing.document.id}/file`}
          initialStrokes={(viewing.overlayData as Stroke[]) ?? []}
          interactive={false}
        />
      ) : activeDocumentId ? (
        <FaceogramCanvas
          imageUrl={`/api/staff/documents/${activeDocumentId}/file`}
          initialStrokes={initialStrokes}
          onSave={handleSave}
          saving={saving}
        />
      ) : plannings === null ? (
        <FalhaAoCarregar oQue="o faceograma" />
      ) : (
        <p className={s.vazio}>Nenhuma foto enviada ainda.</p>
      )}

      <div className={s.campo} style={{ maxWidth: 320 }}>
        <label className={s.rotuloCampo}>{activeDocumentId ? "Enviar nova foto (nova versão)" : "Enviar foto"}</label>
        <input type="file" accept="image/*" onChange={handleUpload} disabled={uploading} />
      </div>
    </section>
  );
}
