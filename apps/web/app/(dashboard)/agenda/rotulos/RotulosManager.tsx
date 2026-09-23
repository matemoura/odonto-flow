"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@odontoflow/ui";
import type { AppointmentLabel } from "../../../../lib/api";
import s from "../../admin.module.css";

const COR_PADRAO = "#3B82F6";

function LabelRow({ label }: { label: AppointmentLabel }) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [name, setName] = useState(label.name);
  const [color, setColor] = useState(label.color);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function handleSalvar() {
    setErro(null);
    setEnviando(true);
    try {
      const res = await fetch(`/api/agenda/labels/${label.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, color }),
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

  async function handleExcluir() {
    if (!window.confirm(`Excluir o rótulo "${label.name}"? As consultas que o usam ficam sem rótulo.`)) return;
    setErro(null);
    setEnviando(true);
    try {
      const res = await fetch(`/api/agenda/labels/${label.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      setErro("Falha ao excluir.");
      setEnviando(false);
    }
  }

  if (editando) {
    return (
      <tr>
        <td>
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} style={{ width: 40, height: 28, padding: 0, border: "none" }} />
        </td>
        <td>
          <input className={s.input} value={name} onChange={(e) => setName(e.target.value)} style={{ padding: "6px 10px" }} />
        </td>
        <td colSpan={2}>
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            <button type="button" className="odontoflow-btn odontoflow-btn--secondary odontoflow-btn--sm" disabled={enviando} onClick={handleSalvar}>
              Salvar
            </button>
            <button type="button" className="odontoflow-btn odontoflow-btn--ghost odontoflow-btn--sm" disabled={enviando} onClick={() => setEditando(false)}>
              Cancelar
            </button>
            {erro ? <span style={{ fontSize: 11.5, color: "var(--ameixa)" }}>{erro}</span> : null}
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td>
        <span style={{ display: "inline-block", width: 20, height: 20, borderRadius: "var(--r-sm)", background: label.color, border: "1px solid var(--linha-forte)" }} />
      </td>
      <td>{label.name}</td>
      <td>
        <button type="button" className="odontoflow-btn odontoflow-btn--ghost odontoflow-btn--sm" onClick={() => setEditando(true)}>
          Editar
        </button>
      </td>
      <td>
        <button type="button" className="odontoflow-btn odontoflow-btn--ghost odontoflow-btn--sm" onClick={handleExcluir}>
          Excluir
        </button>
      </td>
    </tr>
  );
}

export function RotulosManager({ labels }: { labels: AppointmentLabel[] }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState(COR_PADRAO);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      const res = await fetch("/api/agenda/labels", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, color }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? "Não foi possível criar o rótulo.");
      }
      setAberto(false);
      setName("");
      setColor(COR_PADRAO);
      router.refresh();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível criar o rótulo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {labels.length === 0 ? (
        <p className={s.vazio}>Nenhum rótulo cadastrado ainda.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table className={s.tabela}>
            <thead>
              <tr>
                <th>Cor</th>
                <th>Nome</th>
                <th></th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {labels.map((label) => (
                <LabelRow key={label.id} label={label} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!aberto ? (
        <Button variant="primary" onClick={() => setAberto(true)} style={{ alignSelf: "flex-start" }}>
          + Novo rótulo
        </Button>
      ) : (
        <form onSubmit={handleSubmit} className={s.form} style={{ maxWidth: 360 }}>
          {erro ? (
            <p className={s.erro} role="alert">
              {erro}
            </p>
          ) : null}
          <div className={s.campo}>
            <label className={s.rotuloCampo}>Nome</label>
            <input className={s.input} value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className={s.campo}>
            <label className={s.rotuloCampo}>Cor</label>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              style={{ width: 60, height: 36, padding: 0, border: "none" }}
            />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Button type="submit" variant="primary" disabled={enviando}>
              {enviando ? "Salvando…" : "Salvar rótulo"}
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
