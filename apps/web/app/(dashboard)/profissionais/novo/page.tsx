"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@odontoflow/ui";
import s from "../../admin.module.css";

export default function NovoProfissionalPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [croNumber, setCroNumber] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      const res = await fetch("/api/staff/professionals", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password: password || undefined,
          specialty: specialty || undefined,
          croNumber: croNumber || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? "Não foi possível cadastrar.");
      }
      router.push("/profissionais");
      router.refresh();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível cadastrar.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className={s.pagina}>
      <h1 className={s.titulo}>Novo profissional</h1>
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
          <label className={s.rotuloCampo} htmlFor="email">
            E-mail (login)
          </label>
          <input
            id="email"
            type="email"
            className={s.input}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className={s.campo}>
          <label className={s.rotuloCampo} htmlFor="password">
            Senha de acesso
          </label>
          <input
            id="password"
            type="password"
            className={s.input}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            placeholder="mínimo 8 caracteres"
          />
          <small>Deixe em branco se este e-mail já tem uma conta (ex.: já é paciente).</small>
        </div>
        <div className={s.campo}>
          <label className={s.rotuloCampo} htmlFor="specialty">
            Especialidade
          </label>
          <input
            id="specialty"
            className={s.input}
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
          />
        </div>
        <div className={s.campo}>
          <label className={s.rotuloCampo} htmlFor="croNumber">
            Número do CRO
          </label>
          <input
            id="croNumber"
            className={s.input}
            value={croNumber}
            onChange={(e) => setCroNumber(e.target.value)}
          />
        </div>
        <div>
          <Button type="submit" variant="primary" disabled={enviando} aria-disabled={enviando}>
            {enviando ? "Salvando…" : "Salvar profissional"}
          </Button>
        </div>
      </form>
    </div>
  );
}
