"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@odontoflow/ui";
import s from "../entrar.module.css";

export function EntrarClinicaForm({ clinicSlug, clinicName }: { clinicSlug: string; clinicName: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      const res = await fetch("/api/session/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ clinicSlug, email, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? "Não foi possível entrar.");
      }
      const next = searchParams.get("next") ?? "/agenda";
      router.push(next);
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
      <p className={s.subtitulo}>
        Entrar em <strong>{clinicName}</strong> como profissional ou administrador.
      </p>

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

      <p className={s.rodape}>
        Não é da clínica <strong>{clinicName}</strong>?{" "}
        <Link href="/entrar">Entrar em outra clínica</Link>.
        {clinicSlug === "vila-nova" ? (
          <>
            <br />
            Ambiente de demonstração — use ana.prado@vilanova.com ou admin@vilanova.com, senha
            senha123.
          </>
        ) : null}
      </p>
    </div>
  );
}
