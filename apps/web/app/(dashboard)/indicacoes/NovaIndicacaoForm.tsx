"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@odontoflow/ui";
import type { Patient } from "../../../lib/api";
import s from "../admin.module.css";

export function NovaIndicacaoForm({ patients }: { patients: Patient[] }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [referrerPatientId, setReferrerPatientId] = useState(patients[0]?.id ?? "");
  const [referredName, setReferredName] = useState("");
  const [referredPhone, setReferredPhone] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      const res = await fetch("/api/staff/referrals", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ referrerPatientId, referredName, referredPhone: referredPhone || undefined }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? "Não foi possível salvar.");
      }
      setReferredName("");
      setReferredPhone("");
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
        + Nova indicação
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
        <label className={s.rotuloCampo} htmlFor="referrerPatientId">
          Quem indicou
        </label>
        <select
          id="referrerPatientId"
          className={s.input}
          value={referrerPatientId}
          onChange={(e) => setReferrerPatientId(e.target.value)}
        >
          {patients.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
      <div className={s.campo}>
        <label className={s.rotuloCampo} htmlFor="referredName">
          Nome de quem foi indicado
        </label>
        <input
          id="referredName"
          className={s.input}
          value={referredName}
          onChange={(e) => setReferredName(e.target.value)}
          required
        />
      </div>
      <div className={s.campo}>
        <label className={s.rotuloCampo} htmlFor="referredPhone">
          Telefone
        </label>
        <input
          id="referredPhone"
          className={s.input}
          value={referredPhone}
          onChange={(e) => setReferredPhone(e.target.value)}
        />
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <Button type="submit" variant="primary" disabled={enviando} aria-disabled={enviando}>
          {enviando ? "Salvando…" : "Salvar"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setAberto(false)}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
