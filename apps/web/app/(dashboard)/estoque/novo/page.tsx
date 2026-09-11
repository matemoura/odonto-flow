"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@odontoflow/ui";
import s from "../../admin.module.css";

export default function NovoItemEstoquePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("");
  const [costReais, setCostReais] = useState("");
  const [quantityOnHand, setQuantityOnHand] = useState(0);
  const [minQuantity, setMinQuantity] = useState(0);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      const unitCostCents = costReais ? Math.round(Number(costReais.replace(",", ".")) * 100) : 0;
      if (!Number.isFinite(unitCostCents) || unitCostCents < 0) {
        throw new Error("Informe um custo válido.");
      }
      const res = await fetch("/api/staff/inventory-items", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, unit, unitCostCents, quantityOnHand, minQuantity }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? "Não foi possível cadastrar.");
      }
      router.push("/estoque");
      router.refresh();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível cadastrar.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className={s.pagina}>
      <h1 className={s.titulo}>Novo item de estoque</h1>
      {erro ? (
        <p className={s.erro} role="alert">
          {erro}
        </p>
      ) : null}
      <form onSubmit={handleSubmit} className={s.form}>
        <div className={s.campo}>
          <label className={s.rotuloCampo} htmlFor="name">
            Nome
          </label>
          <input id="name" className={s.input} value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className={s.campo}>
          <label className={s.rotuloCampo} htmlFor="unit">
            Unidade de medida
          </label>
          <input
            id="unit"
            className={s.input}
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            placeholder="un, ml, g, caixa…"
            required
          />
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
            placeholder="0,00"
          />
        </div>
        <div className={s.campo}>
          <label className={s.rotuloCampo} htmlFor="quantityOnHand">
            Quantidade inicial em estoque
          </label>
          <input
            id="quantityOnHand"
            type="number"
            min={0}
            className={s.input}
            value={quantityOnHand}
            onChange={(e) => setQuantityOnHand(Number(e.target.value))}
          />
        </div>
        <div className={s.campo}>
          <label className={s.rotuloCampo} htmlFor="minQuantity">
            Quantidade mínima (aviso de reposição)
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
        <div>
          <Button type="submit" variant="primary" disabled={enviando} aria-disabled={enviando}>
            {enviando ? "Salvando…" : "Salvar item"}
          </Button>
        </div>
      </form>
    </div>
  );
}
