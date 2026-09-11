"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@odontoflow/ui";
import type { InventoryItem, Procedure } from "../../../../lib/api";
import s from "../../admin.module.css";

function formatCents(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

function centsToInput(cents: number) {
  return (cents / 100).toFixed(2).replace(".", ",");
}

function reaisToCents(value: string) {
  return Math.round(Number(value.replace(",", ".")) * 100);
}

export function ServicoDetail({
  procedure,
  inventoryItems,
}: {
  procedure: Procedure;
  inventoryItems: InventoryItem[];
}) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);

  const [name, setName] = useState(procedure.name);
  const [code, setCode] = useState(procedure.code ?? "");
  const [priceReais, setPriceReais] = useState(centsToInput(procedure.defaultPriceCents));
  const [active, setActive] = useState(procedure.active);
  const [salvandoInfo, setSalvandoInfo] = useState(false);
  const [excluindo, setExcluindo] = useState(false);

  const [inventoryItemId, setInventoryItemId] = useState(inventoryItems[0]?.id ?? "");
  const [quantityUsed, setQuantityUsed] = useState(1);
  const [adicionandoMaterial, setAdicionandoMaterial] = useState(false);
  const [linhaEmAndamento, setLinhaEmAndamento] = useState<string | null>(null);

  async function handleSalvarInfo(event: FormEvent) {
    event.preventDefault();
    setErro(null);
    setSalvandoInfo(true);
    try {
      const defaultPriceCents = reaisToCents(priceReais);
      if (!Number.isFinite(defaultPriceCents) || defaultPriceCents < 0) {
        throw new Error("Informe um preço válido.");
      }
      const res = await fetch(`/api/staff/procedures/${procedure.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, code: code || undefined, defaultPriceCents, active }),
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
    if (!window.confirm(`Excluir o serviço "${procedure.name}"?`)) return;
    setErro(null);
    setExcluindo(true);
    try {
      const res = await fetch(`/api/staff/procedures/${procedure.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? "Não foi possível excluir.");
      }
      router.push("/servicos");
      router.refresh();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível excluir.");
      setExcluindo(false);
    }
  }

  async function handleAddMaterial(event: FormEvent) {
    event.preventDefault();
    if (!inventoryItemId) return;
    setErro(null);
    setAdicionandoMaterial(true);
    try {
      const res = await fetch(`/api/staff/procedures/${procedure.id}/materials`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ inventoryItemId, quantityUsed }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? "Não foi possível adicionar o material.");
      }
      setQuantityUsed(1);
      router.refresh();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível adicionar o material.");
    } finally {
      setAdicionandoMaterial(false);
    }
  }

  async function handleUpdateMaterialQty(materialId: string, novaQuantidade: number) {
    setErro(null);
    setLinhaEmAndamento(materialId);
    try {
      const res = await fetch(`/api/staff/procedures/${procedure.id}/materials/${materialId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ quantityUsed: novaQuantidade }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? "Não foi possível atualizar a quantidade.");
      }
      router.refresh();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível atualizar a quantidade.");
    } finally {
      setLinhaEmAndamento(null);
    }
  }

  async function handleRemoveMaterial(materialId: string) {
    setErro(null);
    setLinhaEmAndamento(materialId);
    try {
      const res = await fetch(`/api/staff/procedures/${procedure.id}/materials/${materialId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? "Não foi possível remover o material.");
      }
      router.refresh();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível remover o material.");
    } finally {
      setLinhaEmAndamento(null);
    }
  }

  const custoTotal = procedure.materials.reduce((sum, m) => sum + m.quantityUsed * m.inventoryItem.unitCostCents, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {erro ? (
        <p className={s.erro} role="alert">
          {erro}
        </p>
      ) : null}

      <div className={s.blocos}>
        <section className={s.bloco}>
        <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>Dados do serviço</h2>
        <form onSubmit={handleSalvarInfo} className={s.form}>
          <div className={s.campo}>
            <label className={s.rotuloCampo} htmlFor="name">
              Nome
            </label>
            <input id="name" className={s.input} value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className={s.campo}>
            <label className={s.rotuloCampo} htmlFor="code">
              Código
            </label>
            <input id="code" className={s.input} value={code} onChange={(e) => setCode(e.target.value)} />
          </div>
          <div className={s.campo}>
            <label className={s.rotuloCampo} htmlFor="price">
              Preço de venda (R$)
            </label>
            <input
              id="price"
              className={s.input}
              inputMode="decimal"
              value={priceReais}
              onChange={(e) => setPriceReais(e.target.value)}
              required
            />
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            Ativo (aparece na escolha de novo orçamento)
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <Button type="submit" variant="primary" disabled={salvandoInfo}>
              {salvandoInfo ? "Salvando…" : "Salvar alterações"}
            </Button>
            <Button type="button" variant="ghost" onClick={handleExcluir} disabled={excluindo}>
              {excluindo ? "Excluindo…" : "Excluir serviço"}
            </Button>
          </div>
        </form>
      </section>

        <section className={s.bloco}>
        <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Materiais usados</h2>
        <p style={{ fontSize: 12.5, color: "var(--tinta-70)", marginBottom: 10 }}>
          Custo estimado do serviço: <strong>{formatCents(custoTotal)}</strong> (soma da quantidade × custo unitário de
          cada material).
        </p>

        {procedure.materials.length === 0 ? (
          <p className={s.vazio}>Nenhum material vinculado ainda.</p>
        ) : (
          <div style={{ overflowX: "auto", marginBottom: 16 }}>
            <table className={s.tabela}>
              <thead>
                <tr>
                  <th>Material</th>
                  <th>Qtd. por procedimento</th>
                  <th>Custo unit.</th>
                  <th>Subtotal</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {procedure.materials.map((m) => (
                  <tr key={m.id}>
                    <td>
                      {m.inventoryItem.name} ({m.inventoryItem.unit})
                    </td>
                    <td>
                      <input
                        type="number"
                        min={1}
                        className={s.input}
                        style={{ minHeight: 34, maxWidth: 90, padding: "0 8px" }}
                        defaultValue={m.quantityUsed}
                        disabled={linhaEmAndamento === m.id}
                        onBlur={(e) => {
                          const valor = Number(e.target.value);
                          if (valor > 0 && valor !== m.quantityUsed) handleUpdateMaterialQty(m.id, valor);
                        }}
                      />
                    </td>
                    <td>{formatCents(m.inventoryItem.unitCostCents)}</td>
                    <td>{formatCents(m.quantityUsed * m.inventoryItem.unitCostCents)}</td>
                    <td>
                      <button
                        type="button"
                        className="odontoflow-btn odontoflow-btn--ghost odontoflow-btn--sm"
                        disabled={linhaEmAndamento === m.id}
                        onClick={() => handleRemoveMaterial(m.id)}
                      >
                        Remover
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {inventoryItems.length === 0 ? (
          <p className={s.vazio}>Cadastre itens em Estoque antes de vincular materiais a este serviço.</p>
        ) : (
          <form onSubmit={handleAddMaterial} style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
            <div className={s.campo} style={{ minWidth: 220 }}>
              <label className={s.rotuloCampo}>Item de estoque</label>
              <select
                className={s.input}
                value={inventoryItemId}
                onChange={(e) => setInventoryItemId(e.target.value)}
              >
                {inventoryItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.unit})
                  </option>
                ))}
              </select>
            </div>
            <div className={s.campo} style={{ maxWidth: 120 }}>
              <label className={s.rotuloCampo}>Quantidade</label>
              <input
                type="number"
                min={1}
                className={s.input}
                value={quantityUsed}
                onChange={(e) => setQuantityUsed(Number(e.target.value))}
              />
            </div>
            <Button type="submit" variant="secondary" disabled={adicionandoMaterial}>
              {adicionandoMaterial ? "Adicionando…" : "+ Adicionar material"}
            </Button>
          </form>
        )}
        </section>
      </div>
    </div>
  );
}
