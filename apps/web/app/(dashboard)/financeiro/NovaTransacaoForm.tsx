"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@odontoflow/ui";
import type { StaffProfessional, TransactionType } from "../../../lib/api";
import s from "../admin.module.css";

export function NovaTransacaoForm({ professionals }: { professionals: StaffProfessional[] }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [type, setType] = useState<TransactionType>("INCOME");
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [installments, setInstallments] = useState("1");
  const [professionalId, setProfessionalId] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      const res = await fetch("/api/staff/finance/transactions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          type,
          category,
          amountCents: Math.round(Number(amount.replace(",", ".")) * 100),
          dueDate: new Date(`${dueDate}T12:00:00`).toISOString(),
          installments: Number(installments) > 1 ? Number(installments) : undefined,
          professionalId: professionalId || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? "Não foi possível salvar.");
      }
      setCategory("");
      setAmount("");
      setInstallments("1");
      setProfessionalId("");
      setAberto(false);
      router.refresh();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível salvar.");
    } finally {
      setEnviando(false);
    }
  }

  if (!aberto) {
    return (
      <Button variant="primary" onClick={() => setAberto(true)} style={{ alignSelf: "flex-start" }}>
        + Novo lançamento
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={s.form}>
      {erro ? (
        <p className={s.erro} role="alert">
          {erro}
        </p>
      ) : null}
      <div className={s.campo}>
        <label className={s.rotuloCampo}>Tipo</label>
        <div style={{ display: "flex", gap: 8 }}>
          <label style={{ display: "flex", gap: 4, alignItems: "center", fontSize: 13 }}>
            <input type="radio" checked={type === "INCOME"} onChange={() => setType("INCOME")} /> Receita
          </label>
          <label style={{ display: "flex", gap: 4, alignItems: "center", fontSize: 13 }}>
            <input type="radio" checked={type === "EXPENSE"} onChange={() => setType("EXPENSE")} /> Despesa
          </label>
        </div>
      </div>
      <div className={s.campo}>
        <label className={s.rotuloCampo} htmlFor="category">
          Categoria
        </label>
        <input
          id="category"
          className={s.input}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          required
        />
      </div>
      <div className={s.campo}>
        <label className={s.rotuloCampo} htmlFor="amount">
          Valor (R$)
        </label>
        <input
          id="amount"
          className={s.input}
          inputMode="decimal"
          placeholder="0,00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />
      </div>
      <div className={s.campo}>
        <label className={s.rotuloCampo} htmlFor="installments">
          Parcelas
        </label>
        <input
          id="installments"
          type="number"
          min={1}
          max={48}
          className={s.input}
          value={installments}
          onChange={(e) => setInstallments(e.target.value)}
        />
        <span style={{ fontSize: 11.5, color: "var(--tinta-55)" }}>
          {Number(installments) > 1 && Number(amount.replace(",", ".")) > 0
            ? `O valor acima é o total: ${installments}x de aproximadamente ${new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
              }).format(Number(amount.replace(",", ".")) / Number(installments))}, um por mês.`
            : "1 = à vista. Acima disso, o valor informado é o total e será dividido mês a mês."}
        </span>
      </div>

      <div className={s.campo}>
        <label className={s.rotuloCampo} htmlFor="dueDate">
          {Number(installments) > 1 ? "Vencimento da 1ª parcela" : "Vencimento"}
        </label>
        <input
          id="dueDate"
          type="date"
          className={s.input}
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          required
        />
      </div>
      {type === "INCOME" && professionals.length > 0 ? (
        <div className={s.campo}>
          <label className={s.rotuloCampo} htmlFor="professionalId">
            Profissional (para comissão automática)
          </label>
          <select
            id="professionalId"
            className={s.input}
            value={professionalId}
            onChange={(e) => setProfessionalId(e.target.value)}
          >
            <option value="">Nenhum</option>
            {professionals.map((p) => (
              <option key={p.id} value={p.id}>
                {p.user.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      <div style={{ display: "flex", gap: 8 }}>
        <Button type="submit" variant="primary" disabled={enviando} aria-disabled={enviando}>
          {enviando ? "Salvando…" : "Salvar lançamento"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setAberto(false)}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
