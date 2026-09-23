"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@odontoflow/ui";
import type { InventoryItem, InventoryMovement } from "../../../../lib/api";
import s from "../../admin.module.css";

const MOVIMENTOS_EDITAVEIS: InventoryMovement["type"][] = ["MANUAL_IN", "MANUAL_OUT"];

function MovimentoRow({ itemId, movimento }: { itemId: string; movimento: InventoryMovement }) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [quantity, setQuantity] = useState(movimento.quantity);
  const [note, setNote] = useState(movimento.note ?? "");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const editavel = MOVIMENTOS_EDITAVEIS.includes(movimento.type);

  async function handleSalvar() {
    setErro(null);
    setSalvando(true);
    try {
      const res = await fetch(`/api/staff/inventory-items/${itemId}/movements/${movimento.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ quantity, note: note || undefined }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? "Não foi possível corrigir esta movimentação.");
      }
      setEditando(false);
      router.refresh();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível corrigir esta movimentação.");
    } finally {
      setSalvando(false);
    }
  }

  if (editando) {
    return (
      <tr>
        <td>{new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(movimento.createdAt))}</td>
        <td>{ROTULO_MOVIMENTO[movimento.type]}</td>
        <td>
          <input
            type="number"
            min={1}
            className={s.input}
            style={{ maxWidth: 90, padding: "4px 8px" }}
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
          />
        </td>
        <td colSpan={2}>
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            <input
              className={s.input}
              style={{ minWidth: 140, padding: "4px 8px" }}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Observação"
            />
            <button type="button" className="odontoflow-btn odontoflow-btn--secondary odontoflow-btn--sm" disabled={salvando} onClick={handleSalvar}>
              Salvar
            </button>
            <button
              type="button"
              className="odontoflow-btn odontoflow-btn--ghost odontoflow-btn--sm"
              disabled={salvando}
              onClick={() => setEditando(false)}
            >
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
      <td>{new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(movimento.createdAt))}</td>
      <td>{ROTULO_MOVIMENTO[movimento.type]}</td>
      <td>{movimento.quantity}</td>
      <td>
        {movimento.note ?? "—"}
        {movimento.editedAt ? <span style={{ fontSize: 11, color: "var(--tinta-55)" }}> (corrigido)</span> : null}
      </td>
      <td>
        {editavel ? (
          <button type="button" className="odontoflow-btn odontoflow-btn--ghost odontoflow-btn--sm" onClick={() => setEditando(true)}>
            Editar
          </button>
        ) : null}
      </td>
    </tr>
  );
}

function formatCents(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

function centsToInput(cents: number) {
  return (cents / 100).toFixed(2).replace(".", ",");
}

const ROTULO_MOVIMENTO: Record<InventoryMovement["type"], string> = {
  MANUAL_IN: "Entrada manual",
  MANUAL_OUT: "Saída manual",
  RESERVED: "Reservado (orçamento aprovado)",
  RELEASED: "Reserva liberada",
  CONSUMED: "Consumido (procedimento finalizado)",
};

export function ItemEstoqueDetail({ item, movements }: { item: InventoryItem; movements: InventoryMovement[] }) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);

  const [name, setName] = useState(item.name);
  const [unit, setUnit] = useState(item.unit);
  const [costReais, setCostReais] = useState(centsToInput(item.unitCostCents));
  const [minQuantity, setMinQuantity] = useState(item.minQuantity);
  const [salvandoInfo, setSalvandoInfo] = useState(false);
  const [excluindo, setExcluindo] = useState(false);

  const [direction, setDirection] = useState<"IN" | "OUT">("IN");
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState("");
  const [ajustando, setAjustando] = useState(false);

  async function handleSalvarInfo(event: FormEvent) {
    event.preventDefault();
    setErro(null);
    setSalvandoInfo(true);
    try {
      const unitCostCents = Math.round(Number(costReais.replace(",", ".")) * 100);
      if (!Number.isFinite(unitCostCents) || unitCostCents < 0) {
        throw new Error("Informe um custo válido.");
      }
      const res = await fetch(`/api/staff/inventory-items/${item.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, unit, unitCostCents, minQuantity }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? "Não foi possível salvar.");
      }
      router.refresh();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível salvar.");
    } finally {
      setSalvandoInfo(false);
    }
  }

  async function handleExcluir() {
    if (!window.confirm(`Excluir o item "${item.name}" do estoque?`)) return;
    setErro(null);
    setExcluindo(true);
    try {
      const res = await fetch(`/api/staff/inventory-items/${item.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? "Não foi possível excluir.");
      }
      router.push("/estoque");
      router.refresh();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível excluir.");
      setExcluindo(false);
    }
  }

  async function handleAjustar(event: FormEvent) {
    event.preventDefault();
    setErro(null);
    setAjustando(true);
    try {
      const res = await fetch(`/api/staff/inventory-items/${item.id}/adjust`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ direction, quantity, note: note || undefined }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? "Não foi possível ajustar o estoque.");
      }
      setQuantity(1);
      setNote("");
      router.refresh();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível ajustar o estoque.");
    } finally {
      setAjustando(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {erro ? (
        <p className={s.erro} role="alert">
          {erro}
        </p>
      ) : null}

      <section
        style={{
          display: "flex",
          gap: 20,
          flexWrap: "wrap",
          padding: 14,
          background: "var(--gaze)",
          borderRadius: "var(--r-md)",
          fontSize: 13,
        }}
      >
        <span>
          Em estoque: <strong>{item.quantityOnHand}</strong> {item.unit}
        </span>
        <span>
          Reservado: <strong>{item.quantityReserved}</strong>
        </span>
        <span>
          Disponível: <strong>{item.available}</strong>
        </span>
        <span>
          Custo unitário: <strong>{formatCents(item.unitCostCents)}</strong>
        </span>
        {item.needsRestock ? <span className="chip chip--estatico chip--alerta">Precisa repor</span> : null}
      </section>

      <div className={s.blocos}>
        <section className={s.bloco}>
        <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>Dados do item</h2>
        <form onSubmit={handleSalvarInfo} className={s.form}>
          <div className={s.campo}>
            <label className={s.rotuloCampo} htmlFor="name">
              Nome
            </label>
            <input id="name" className={s.input} value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className={s.campo}>
            <label className={s.rotuloCampo} htmlFor="unit">
              Unidade
            </label>
            <input id="unit" className={s.input} value={unit} onChange={(e) => setUnit(e.target.value)} required />
          </div>
          <div className={s.campo}>
            <label className={s.rotuloCampo} htmlFor="cost">
              Custo unitário (R$)
            </label>
            <input
              id="cost"
              className={s.input}
              inputMode="decimal"
              value={costReais}
              onChange={(e) => setCostReais(e.target.value)}
              required
            />
          </div>
          <div className={s.campo}>
            <label className={s.rotuloCampo} htmlFor="minQuantity">
              Quantidade mínima
            </label>
            <input
              id="minQuantity"
              type="number"
              min={0}
              className={s.input}
              value={minQuantity}
              onChange={(e) => setMinQuantity(Number(e.target.value))}
            />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Button type="submit" variant="primary" disabled={salvandoInfo}>
              {salvandoInfo ? "Salvando…" : "Salvar alterações"}
            </Button>
            <Button type="button" variant="ghost" onClick={handleExcluir} disabled={excluindo}>
              {excluindo ? "Excluindo…" : "Excluir item"}
            </Button>
          </div>
        </form>
      </section>

        <section className={s.bloco}>
        <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>Ajustar estoque manualmente</h2>
        <form onSubmit={handleAjustar} style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div className={s.campo}>
            <label className={s.rotuloCampo}>Tipo</label>
            <select className={s.input} value={direction} onChange={(e) => setDirection(e.target.value as "IN" | "OUT")}>
              <option value="IN">Entrada (compra/reposição)</option>
              <option value="OUT">Saída (perda/ajuste)</option>
            </select>
          </div>
          <div className={s.campo} style={{ maxWidth: 120 }}>
            <label className={s.rotuloCampo}>Quantidade</label>
            <input
              type="number"
              min={1}
              className={s.input}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
            />
          </div>
          <div className={s.campo} style={{ minWidth: 180 }}>
            <label className={s.rotuloCampo}>Observação (opcional)</label>
            <input className={s.input} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <Button type="submit" variant="secondary" disabled={ajustando}>
            {ajustando ? "Salvando…" : "Registrar"}
          </Button>
        </form>
      </section>

        <section className={s.bloco}>
        <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>Histórico</h2>
        {movements.length === 0 ? (
          <p className={s.vazio}>Nenhuma movimentação ainda.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className={s.tabela}>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Tipo</th>
                  <th>Quantidade</th>
                  <th>Observação</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {movements.map((mov) => (
                  <MovimentoRow key={mov.id} itemId={item.id} movimento={mov} />
                ))}
              </tbody>
            </table>
          </div>
        )}
        </section>
      </div>
    </div>
  );
}
