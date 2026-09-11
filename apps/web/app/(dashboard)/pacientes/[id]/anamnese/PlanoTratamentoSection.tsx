"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@odontoflow/ui";
import type { StaffProfessional, TreatmentPlanOption } from "../../../../../lib/api";
import s from "../../../admin.module.css";

const MINIMO_OPCOES = 3;

function formatCents(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

function OptionCard({ option }: { option: TreatmentPlanOption }) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function handleToggleRecomendado() {
    setErro(null);
    setEnviando(true);
    try {
      const res = await fetch(`/api/staff/clinical-records/treatment-plan-options/${option.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ recommended: !option.recommended }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      setErro("Falha ao atualizar.");
    } finally {
      setEnviando(false);
    }
  }

  async function handleExcluir() {
    if (!window.confirm(`Excluir "${option.label}"?`)) return;
    setErro(null);
    setEnviando(true);
    try {
      const res = await fetch(`/api/staff/clinical-records/treatment-plan-options/${option.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      setErro("Falha ao excluir.");
      setEnviando(false);
    }
  }

  return (
    <div style={{ padding: 12, background: "var(--gaze)", borderRadius: "var(--r-md)", display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
        <strong style={{ fontSize: 13 }}>{option.label}</strong>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {option.recommended ? <span className="chip chip--estatico">Recomendada</span> : null}
          {option.professional ? (
            <span style={{ fontSize: 11.5, color: "var(--tinta-55)" }}>{option.professional.user.name}</span>
          ) : null}
        </div>
      </div>
      <p style={{ fontSize: 12.5, whiteSpace: "pre-wrap" }}>{option.description}</p>
      {option.estimatedCostCents !== null ? (
        <span style={{ fontSize: 12.5, fontWeight: 600 }}>Estimativa: {formatCents(option.estimatedCostCents)}</span>
      ) : null}
      {erro ? (
        <p className={s.erro} role="alert">
          {erro}
        </p>
      ) : null}
      <div style={{ display: "flex", gap: 6 }}>
        <button
          type="button"
          className="odontoflow-btn odontoflow-btn--ghost odontoflow-btn--sm"
          disabled={enviando}
          onClick={handleToggleRecomendado}
        >
          {option.recommended ? "Desmarcar recomendada" : "Marcar como recomendada"}
        </button>
        <button
          type="button"
          className="odontoflow-btn odontoflow-btn--ghost odontoflow-btn--sm"
          disabled={enviando}
          onClick={handleExcluir}
        >
          Excluir
        </button>
      </div>
    </div>
  );
}

export function PlanoTratamentoSection({
  patientId,
  options,
  professionals,
}: {
  patientId: string;
  options: TreatmentPlanOption[];
  professionals: StaffProfessional[];
}) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [label, setLabel] = useState(`Opção ${options.length + 1}`);
  const [description, setDescription] = useState("");
  const [professionalId, setProfessionalId] = useState(professionals[0]?.id ?? "");
  const [costReais, setCostReais] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      const estimatedCostCents = costReais ? Math.round(Number(costReais.replace(",", ".")) * 100) : undefined;
      const res = await fetch("/api/staff/clinical-records/treatment-plan-options", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          patientId,
          label,
          description,
          professionalId: professionalId || undefined,
          estimatedCostCents,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? "Não foi possível salvar.");
      }
      setAberto(false);
      setLabel(`Opção ${options.length + 2}`);
      setDescription("");
      setCostReais("");
      router.refresh();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível salvar.");
    } finally {
      setEnviando(false);
    }
  }

  const faltam = Math.max(0, MINIMO_OPCOES - options.length);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span className={faltam > 0 ? "chip chip--estatico chip--alerta" : "chip chip--estatico"}>
          {options.length} de {MINIMO_OPCOES} opções mínimas
        </span>
        {faltam > 0 ? (
          <span style={{ fontSize: 12, color: "var(--tinta-55)" }}>
            Faltam {faltam} {faltam === 1 ? "opção" : "opções"} pra completar o mínimo recomendado.
          </span>
        ) : null}
      </div>

      {options.length === 0 ? (
        <p className={s.vazio}>Nenhuma opção de plano de tratamento ainda.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {options.map((option) => (
            <OptionCard key={option.id} option={option} />
          ))}
        </div>
      )}

      {!aberto ? (
        <Button variant="primary" onClick={() => setAberto(true)} style={{ alignSelf: "flex-start" }}>
          + Nova opção
        </Button>
      ) : (
        <form onSubmit={handleSubmit} className={s.form}>
          {erro ? (
            <p className={s.erro} role="alert">
              {erro}
            </p>
          ) : null}
          <div className={s.campo}>
            <label className={s.rotuloCampo}>Nome da opção</label>
            <input className={s.input} value={label} onChange={(e) => setLabel(e.target.value)} required />
          </div>
          <div className={s.campo}>
            <label className={s.rotuloCampo}>Descrição</label>
            <textarea
              className={s.input}
              style={{ minHeight: 80, padding: 10 }}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>
          {professionals.length > 0 ? (
            <div className={s.campo}>
              <label className={s.rotuloCampo}>Profissional responsável</label>
              <select className={s.input} value={professionalId} onChange={(e) => setProfessionalId(e.target.value)}>
                {professionals.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.user.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <div className={s.campo}>
            <label className={s.rotuloCampo}>Estimativa de custo (R$, opcional)</label>
            <input
              className={s.input}
              inputMode="decimal"
              value={costReais}
              onChange={(e) => setCostReais(e.target.value)}
              placeholder="0,00"
            />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Button type="submit" variant="primary" disabled={enviando}>
              {enviando ? "Salvando…" : "Salvar opção"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setAberto(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
