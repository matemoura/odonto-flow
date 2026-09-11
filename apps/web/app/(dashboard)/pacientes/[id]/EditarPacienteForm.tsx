"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@odontoflow/ui";
import type { Patient } from "../../../../lib/api";
import s from "../../admin.module.css";

export function EditarPacienteForm({ patient }: { patient: Patient }) {
  const router = useRouter();
  const [name, setName] = useState(patient.name);
  const [phone, setPhone] = useState(patient.phone ?? "");
  const [email, setEmail] = useState(patient.email ?? "");
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErro(null);
    setSucesso(false);
    setEnviando(true);
    try {
      const res = await fetch(`/api/staff/patients/${patient.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, phone: phone || undefined, email: email || undefined }),
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
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={s.form}>
      {erro ? (
        <p className={s.erro} role="alert">
          {erro}
        </p>
      ) : null}
      {sucesso ? <p className={s.sucesso}>Salvo.</p> : null}
      <div className={s.campo}>
        <label className={s.rotuloCampo} htmlFor="name">
          Nome completo
        </label>
        <input id="name" className={s.input} value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div className={s.campo}>
        <label className={s.rotuloCampo} htmlFor="phone">
          Telefone
        </label>
        <input id="phone" className={s.input} value={phone} onChange={(e) => setPhone(e.target.value)} />
      </div>
      <div className={s.campo}>
        <label className={s.rotuloCampo} htmlFor="email">
          E-mail
        </label>
        <input
          id="email"
          type="email"
          className={s.input}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div>
        <Button type="submit" variant="primary" disabled={enviando} aria-disabled={enviando}>
          {enviando ? "Salvando…" : "Salvar alterações"}
        </Button>
      </div>
    </form>
  );
}
