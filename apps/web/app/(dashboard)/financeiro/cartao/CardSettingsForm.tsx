"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@odontoflow/ui";
import type { CardSettings } from "../../../../lib/api";
import s from "../../admin.module.css";

export function CardSettingsForm({ settings }: { settings: CardSettings }) {
  const router = useRouter();
  // guardado em pontos-base no banco (300 = 3,00%), mas quem edita pensa em "3"
  const [taxa, setTaxa] = useState((settings.cardFeeBasisPoints / 100).toString().replace(".", ","));
  const [prazo, setPrazo] = useState(String(settings.cardSettlementDays));
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);
  const [salvando, setSalvando] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErro(null);
    setSucesso(false);
    setSalvando(true);
    try {
      const res = await fetch("/api/staff/finance/card-settings", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          cardFeeBasisPoints: Math.round(Number(taxa.replace(",", ".")) * 100),
          cardSettlementDays: Number(prazo),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? "Não foi possível salvar.");
      }
      setSucesso(true);
      router.refresh();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível salvar.");
    } finally {
      setSalvando(false);
    }
  }

  const exemplo = Number(taxa.replace(",", ".")) || 0;

  return (
    <form onSubmit={handleSubmit} className={s.form}>
      {erro ? (
        <p className={s.erro} role="alert">
          {erro}
        </p>
      ) : null}
      {sucesso ? <p className={s.sucesso}>Configuração salva.</p> : null}

      <div className={s.campo}>
        <label className={s.rotuloCampo} htmlFor="taxa">
          Taxa da maquininha (%)
        </label>
        <input
          id="taxa"
          className={s.input}
          inputMode="decimal"
          value={taxa}
          onChange={(e) => setTaxa(e.target.value)}
          required
        />
        <span style={{ fontSize: 12, color: "var(--tinta-70)" }}>
          Descontada automaticamente quando um recebimento é marcado como pago no cartão. Em um
          recebimento de R$ 1.000,00 a clínica fica com{" "}
          {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
            1000 - (1000 * exemplo) / 100,
          )}
          .
        </span>
      </div>

      <div className={s.campo}>
        <label className={s.rotuloCampo} htmlFor="prazo">
          Prazo de recebimento (dias)
        </label>
        <input
          id="prazo"
          type="number"
          min={0}
          max={180}
          className={s.input}
          value={prazo}
          onChange={(e) => setPrazo(e.target.value)}
          required
        />
        <span style={{ fontSize: 12, color: "var(--tinta-70)" }}>
          Dias entre a venda no cartão e o dinheiro cair na conta. Até lá o valor aparece em &quot;a
          compensar&quot;, não no saldo. Use 0 se cai na hora.
        </span>
      </div>

      <p style={{ fontSize: 12, color: "var(--tinta-55)" }}>
        Vale só para dinheiro entrando no cartão. PIX e dinheiro entram na hora e sem taxa, e despesa
        paga no cartão não desconta taxa da clínica. Lançamentos já quitados não mudam.
      </p>

      <div>
        <Button type="submit" variant="primary" disabled={salvando} aria-disabled={salvando}>
          {salvando ? "Salvando…" : "Salvar"}
        </Button>
      </div>
    </form>
  );
}
