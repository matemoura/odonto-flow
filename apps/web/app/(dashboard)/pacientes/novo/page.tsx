"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@odontoflow/ui";
import s from "../../admin.module.css";

export default function NovoPacientePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      const res = await fetch("/api/staff/patients", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          phone: phone || undefined,
          email: email || undefined,
          cpf: cpf || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? "Não foi possível cadastrar.");
      }
      router.push("/pacientes");
      router.refresh();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível cadastrar.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className={s.pagina}>
      <h1 className={s.titulo}>Novo paciente</h1>
      {erro ? (
        <p className={s.erro} role="alert">
          {erro}
        </p>
      ) : null}
      <form onSubmit={handleSubmit} className={s.form}>
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
        <div className={s.campo}>
          <label className={s.rotuloCampo} htmlFor="cpf">
            CPF
          </label>
          <input id="cpf" className={s.input} value={cpf} onChange={(e) => setCpf(e.target.value)} />
        </div>
        <div>
          <Button type="submit" variant="primary" disabled={enviando} aria-disabled={enviando}>
            {enviando ? "Salvando…" : "Salvar paciente"}
          </Button>
        </div>
      </form>
    </div>
  );
}
