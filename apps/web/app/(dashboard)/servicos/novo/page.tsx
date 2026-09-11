"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@odontoflow/ui";
import s from "../../admin.module.css";

export default function NovoServicoPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [priceReais, setPriceReais] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      const defaultPriceCents = Math.round(Number(priceReais.replace(",", ".")) * 100);
      if (!Number.isFinite(defaultPriceCents) || defaultPriceCents < 0) {
        throw new Error("Informe um preço válido.");
      }
      const res = await fetch("/api/staff/procedures", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, code: code || undefined, defaultPriceCents }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? "Não foi possível cadastrar.");
      }
      router.push("/servicos");
      router.refresh();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível cadastrar.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className={s.pagina}>
      <h1 className={s.titulo}>Novo serviço</h1>
      {erro ? (
        <p className={s.erro} role="alert">
          {erro}
        </p>
      ) : null}
      <form onSubmit={handleSubmit} className={s.form}>
        <div className={s.campo}>
          <label className={s.rotuloCampo} htmlFor="name">
            Nome do serviço
          </label>
          <input id="name" className={s.input} value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className={s.campo}>
          <label className={s.rotuloCampo} htmlFor="code">
            Código (opcional)
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
            placeholder="0,00"
            required
          />
        </div>
        <div>
          <Button type="submit" variant="primary" disabled={enviando} aria-disabled={enviando}>
            {enviando ? "Salvando…" : "Salvar serviço"}
          </Button>
        </div>
      </form>
    </div>
  );
}
