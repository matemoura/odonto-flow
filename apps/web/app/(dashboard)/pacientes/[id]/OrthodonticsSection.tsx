"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@odontoflow/ui";
import type { OrthodonticApplianceType, OrthodonticTreatment, StaffProfessional } from "../../../../lib/api";
import s from "../../admin.module.css";

const APPLIANCE_LABEL: Record<OrthodonticApplianceType, string> = {
  METALLIC_BRACKETS: "Aparelho fixo metálico",
  CERAMIC_BRACKETS: "Aparelho fixo estético",
  ALIGNERS: "Alinhadores",
  OTHER: "Outro",
};

const STEP_STATUS_LABEL: Record<string, string> = { PENDING: "Pendente", DONE: "Concluída", SKIPPED: "Pulada" };
const TREATMENT_STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Em andamento",
  PAUSED: "Pausado",
  COMPLETED: "Concluído",
  CANCELLED: "Cancelado",
};

function TreatmentCard({ treatment }: { treatment: OrthodonticTreatment }) {
  const router = useRouter();
  const [addingStep, setAddingStep] = useState(false);
  const [descricao, setDescricao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function toggleStep(stepId: string, status: "DONE" | "PENDING") {
    setEnviando(true);
    setErro(null);
    try {
      const res = await fetch(`/api/staff/orthodontics/steps/${stepId}/status`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      setErro("Falha ao atualizar a etapa.");
    } finally {
      setEnviando(false);
    }
  }

  async function handleAddStep(event: FormEvent) {
    event.preventDefault();
    setEnviando(true);
    setErro(null);
    try {
      const res = await fetch(`/api/staff/orthodontics/treatments/${treatment.id}/steps`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ description: descricao }),
      });
      if (!res.ok) throw new Error();
      setDescricao("");
      setAddingStep(false);
      router.refresh();
    } catch {
      setErro("Falha ao adicionar etapa.");
    } finally {
      setEnviando(false);
    }
  }

  async function markTreatmentDone() {
    setEnviando(true);
    setErro(null);
    try {
      const res = await fetch(`/api/staff/orthodontics/treatments/${treatment.id}/status`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "COMPLETED" }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      setErro("Falha ao concluir tratamento.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div style={{ padding: 12, background: "var(--gaze)", borderRadius: "var(--r-md)", display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <strong style={{ fontSize: 13 }}>
          {APPLIANCE_LABEL[treatment.applianceType]} — com {treatment.professional.user.name}
        </strong>
        <span className="chip chip--estatico">{TREATMENT_STATUS_LABEL[treatment.status]}</span>
      </div>
      <span style={{ fontSize: 12, color: "var(--tinta-55)" }}>
        Início em {new Intl.DateTimeFormat("pt-BR").format(new Date(treatment.startedAt))}
        {treatment.notes ? ` — ${treatment.notes}` : ""}
      </span>

      <ol style={{ margin: 0, padding: "0 0 0 18px", display: "flex", flexDirection: "column", gap: 4 }}>
        {treatment.steps.map((step) => (
          <li key={step.id} style={{ fontSize: 12.5, display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="checkbox"
              checked={step.status === "DONE"}
              disabled={enviando || treatment.status !== "ACTIVE"}
              onChange={(e) => toggleStep(step.id, e.target.checked ? "DONE" : "PENDING")}
            />
            <span style={{ textDecoration: step.status === "DONE" ? "line-through" : "none" }}>
              {step.description}
            </span>
            <span style={{ color: "var(--tinta-55)" }}>({STEP_STATUS_LABEL[step.status]})</span>
          </li>
        ))}
        {treatment.steps.length === 0 ? <span style={{ fontSize: 12, color: "var(--tinta-55)" }}>Sem etapas cadastradas.</span> : null}
      </ol>

      {erro ? <span style={{ fontSize: 11.5, color: "var(--ameixa)" }}>{erro}</span> : null}

      {treatment.status === "ACTIVE" ? (
        addingStep ? (
          <form onSubmit={handleAddStep} style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <input
              className={s.input}
              style={{ flex: 1, minWidth: 160 }}
              placeholder="Descrição da etapa (ex.: Alinhador 7-8)"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              required
            />
            <Button type="submit" variant="secondary" className="odontoflow-btn--sm" disabled={enviando}>
              Adicionar
            </Button>
            <Button type="button" variant="ghost" className="odontoflow-btn--sm" onClick={() => setAddingStep(false)}>
              Cancelar
            </Button>
          </form>
        ) : (
          <div style={{ display: "flex", gap: 6 }}>
            <Button variant="secondary" className="odontoflow-btn--sm" onClick={() => setAddingStep(true)}>
              + Etapa
            </Button>
            <Button variant="ghost" className="odontoflow-btn--sm" onClick={markTreatmentDone} disabled={enviando}>
              Marcar tratamento como concluído
            </Button>
          </div>
        )
      ) : null}
    </div>
  );
}

export function OrthodonticsSection({
  patientId,
  treatments,
  professionals,
}: {
  patientId: string;
  treatments: OrthodonticTreatment[];
  professionals: StaffProfessional[];
}) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [professionalId, setProfessionalId] = useState(professionals[0]?.id ?? "");
  const [applianceType, setApplianceType] = useState<OrthodonticApplianceType>("ALIGNERS");
  const [startedAt, setStartedAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      const res = await fetch("/api/staff/orthodontics/treatments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ patientId, professionalId, applianceType, startedAt, notes: notes || undefined }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? "Não foi possível salvar.");
      }
      setAberto(false);
      setNotes("");
      router.refresh();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível salvar.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section className={s.bloco}>
      <h2 style={{ fontSize: 14, fontWeight: 600 }}>Ortodontia</h2>

      {treatments.length === 0 ? (
        <p className={s.vazio}>Nenhum tratamento ortodôntico ainda.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {treatments.map((t) => (
            <TreatmentCard key={t.id} treatment={t} />
          ))}
        </div>
      )}

      {!aberto ? (
        <Button variant="primary" onClick={() => setAberto(true)} style={{ alignSelf: "flex-start" }} disabled={!professionalId}>
          + Novo tratamento
        </Button>
      ) : (
        <form onSubmit={handleSubmit} className={s.form}>
          {erro ? (
            <p className={s.erro} role="alert">
              {erro}
            </p>
          ) : null}
          <div className={s.campo}>
            <label className={s.rotuloCampo}>Profissional</label>
            <select className={s.input} value={professionalId} onChange={(e) => setProfessionalId(e.target.value)}>
              {professionals.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.user.name}
                </option>
              ))}
            </select>
          </div>
          <div className={s.campo}>
            <label className={s.rotuloCampo}>Aparelho</label>
            <select
              className={s.input}
              value={applianceType}
              onChange={(e) => setApplianceType(e.target.value as OrthodonticApplianceType)}
            >
              {Object.entries(APPLIANCE_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className={s.campo}>
            <label className={s.rotuloCampo}>Início</label>
            <input
              type="date"
              className={s.input}
              value={startedAt}
              onChange={(e) => setStartedAt(e.target.value)}
              required
            />
          </div>
          <div className={s.campo}>
            <label className={s.rotuloCampo}>Observações (opcional)</label>
            <input className={s.input} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Button type="submit" variant="primary" disabled={enviando}>
              {enviando ? "Salvando…" : "Salvar tratamento"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setAberto(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
