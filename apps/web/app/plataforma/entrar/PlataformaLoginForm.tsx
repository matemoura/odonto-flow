"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@odontoflow/ui";
import s from "../../entrar/entrar.module.css";

export function PlataformaLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      const res = await fetch("/api/platform-session/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? "Não foi possível entrar.");
      }
      router.push("/plataforma");
      router.refresh();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível entrar.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className={s.folha}>
      <h1 className={s.marca}>Odonto Flow</h1>
      <p className={s.subtitulo}>Painel do dono da plataforma — administração de clínicas clientes.</p>

      {erro ? (
        <p className={s.erro} role="alert">
          {erro}
        </p>
      ) : null}

      <form onSubmit={handleSubmit}>
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
            autoComplete="username"
            autoFocus
            required
          />
        </div>
        <div className={s.campo}>
          <label className={s.rotuloCampo} htmlFor="password">
            Senha
          </label>
          <input
            id="password"
            type="password"
            className={s.input}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>
        <div className={s.acoes}>
          <Button type="submit" variant="primary" disabled={enviando} aria-disabled={enviando}>
            {enviando ? "Entrando…" : "Entrar"}
          </Button>
        </div>
      </form>
    </div>
  );
}
