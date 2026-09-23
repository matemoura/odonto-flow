"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@odontoflow/ui";
import type { Procedure, StaffProfessional, TreatmentPlanOption } from "../../../../../lib/api";
import s from "../../../admin.module.css";

const MINIMO_OPCOES = 3;

function formatCents(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

function totalDaOpcao(option: TreatmentPlanOption) {
  if (option.items.length > 0) {
    return option.items.reduce((soma, item) => soma + item.unitPriceCents * item.quantity, 0);
  }
  return option.estimatedCostCents ?? 0;
}

function ItemRow({ optionId, item }: { optionId: string; item: TreatmentPlanOption["items"][number] }) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [quantity, setQuantity] = useState(item.quantity);
  const [precoReais, setPrecoReais] = useState((item.unitPriceCents / 100).toFixed(2).replace(".", ","));
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function handleSalvar() {
    setErro(null);
    setEnviando(true);
    try {
      const unitPriceCents = Math.round(Number(precoReais.replace(",", ".")) * 100);
      if (!Number.isFinite(unitPriceCents) || unitPriceCents < 0) {
        throw new Error("Preço inválido.");
      }
      const res = await fetch(`/api/staff/clinical-records/treatment-plan-options/${optionId}/items/${item.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ quantity, unitPriceCents }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? "Não foi possível salvar.");
      }
      setEditando(false);
      router.refresh();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível salvar.");
    } finally {
      setEnviando(false);
    }
  }

  async function handleRemover() {
    if (!window.confirm(`Remover "${item.procedure.name}" desta opção?`)) return;
    setErro(null);
    setEnviando(true);
    try {
      const res = await fetch(`/api/staff/clinical-records/treatment-plan-options/${optionId}/items/${item.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      setErro("Falha ao remover.");
      setEnviando(false);
    }
  }

  if (editando) {
    return (
      <li style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        <span style={{ minWidth: 140 }}>{item.procedure.name}</span>
        <input
          type="number"
          min={1}
          className={s.input}
          style={{ maxWidth: 70, padding: "4px 8px" }}
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
        />
        <input
          className={s.input}
          style={{ maxWidth: 100, padding: "4px 8px" }}
          inputMode="decimal"
          value={precoReais}
          onChange={(e) => setPrecoReais(e.target.value)}
        />
        <button type="button" className="odontoflow-btn odontoflow-btn--secondary odontoflow-btn--sm" disabled={enviando} onClick={handleSalvar}>
          Salvar
        </button>
        <button
          type="button"
          className="odontoflow-btn odontoflow-btn--ghost odontoflow-btn--sm"
          disabled={enviando}
          onClick={() => setEditando(false)}
        >
          Cancelar
        </button>
        {erro ? <span style={{ fontSize: 11.5, color: "var(--ameixa)" }}>{erro}</span> : null}
      </li>
    );
  }

  return (
    <li style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      <span>
        {item.procedure.name} x{item.quantity} — {formatCents(item.unitPriceCents * item.quantity)}
      </span>
      <button type="button" className="odontoflow-btn odontoflow-btn--ghost odontoflow-btn--sm" disabled={enviando} onClick={() => setEditando(true)}>
        Editar
      </button>
      <button type="button" className="odontoflow-btn odontoflow-btn--ghost odontoflow-btn--sm" disabled={enviando} onClick={handleRemover}>
        Remover
      </button>
      {erro ? <span style={{ fontSize: 11.5, color: "var(--ameixa)" }}>{erro}</span> : null}
    </li>
  );
}

function AdicionarServicoForm({
  optionId,
  procedimentosAtivos,
}: {
  optionId: string;
  procedimentosAtivos: Procedure[];
}) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [procedureId, setProcedureId] = useState(procedimentosAtivos[0]?.id ?? "");
  const [quantity, setQuantity] = useState(1);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      const res = await fetch(`/api/staff/clinical-records/treatment-plan-options/${optionId}/items`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ procedureId, quantity }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? "Não foi possível vincular o serviço.");
      }
      setAberto(false);
      setQuantity(1);
      router.refresh();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível vincular o serviço.");
    } finally {
      setEnviando(false);
    }
  }

  if (procedimentosAtivos.length === 0) return null;

  if (!aberto) {
    return (
      <button type="button" className="odontoflow-btn odontoflow-btn--secondary odontoflow-btn--sm" onClick={() => setAberto(true)} style={{ alignSelf: "flex-start" }}>
        + Vincular serviço
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
      <div className={s.campo}>
        <label className={s.rotuloCampo}>Serviço</label>
        <select className={s.input} value={procedureId} onChange={(e) => setProcedureId(e.target.value)}>
          {procedimentosAtivos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({formatCents(p.defaultPriceCents)})
            </option>
          ))}
        </select>
      </div>
      <div className={s.campo} style={{ maxWidth: 90 }}>
        <label className={s.rotuloCampo}>Qtd.</label>
        <input
          type="number"
          min={1}
          className={s.input}
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
        />
      </div>
      <Button type="submit" variant="secondary" className="odontoflow-btn--sm" disabled={enviando}>
        {enviando ? "Adicionando…" : "Adicionar"}
      </Button>
      <Button type="button" variant="ghost" className="odontoflow-btn--sm" onClick={() => setAberto(false)} disabled={enviando}>
        Cancelar
      </Button>
      {erro ? (
        <p className={s.erro} role="alert" style={{ width: "100%" }}>
          {erro}
        </p>
      ) : null}
    </form>
  );
}

function OptionCard({ option, procedimentosAtivos }: { option: TreatmentPlanOption; procedimentosAtivos: Procedure[] }) {
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

  const total = totalDaOpcao(option);

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

      {option.items.length > 0 ? (
        <ul style={{ margin: 0, padding: "0 0 0 16px", fontSize: 12.5, display: "flex", flexDirection: "column", gap: 4 }}>
          {option.items.map((item) => (
            <ItemRow key={item.id} optionId={option.id} item={item} />
          ))}
        </ul>
      ) : null}

      <AdicionarServicoForm optionId={option.id} procedimentosAtivos={procedimentosAtivos} />

      {total > 0 ? <span style={{ fontSize: 12.5, fontWeight: 600 }}>Total: {formatCents(total)}</span> : null}

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
  procedures,
}: {
  patientId: string;
  options: TreatmentPlanOption[];
  professionals: StaffProfessional[];
  procedures: Procedure[];
}) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [label, setLabel] = useState(`Opção ${options.length + 1}`);
  const [description, setDescription] = useState("");
  const [professionalId, setProfessionalId] = useState(professionals[0]?.id ?? "");
  const [costReais, setCostReais] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const procedimentosAtivos = procedures.filter((p) => p.active);

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
            <OptionCard key={option.id} option={option} procedimentosAtivos={procedimentosAtivos} />
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
            <span className={s.dica}>Só usada se nenhum serviço for vinculado depois — com serviços vinculados, o total vira a soma deles.</span>
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
