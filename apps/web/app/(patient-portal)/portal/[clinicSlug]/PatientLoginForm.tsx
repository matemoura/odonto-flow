"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@odontoflow/ui";
import s from "./portal.module.css";

export function PatientLoginForm({ clinicSlug }: { clinicSlug: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("marina.bueno@example.com");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      const res = await fetch("/api/patient-session/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ clinicSlug, email }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? "Não foi possível entrar.");
      }
      router.refresh();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível entrar.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className={s.corpo}>
      <h2 className={s.secaoTitulo}>Acesse seu portal</h2>
      <p style={{ fontSize: 12.5, color: "var(--tinta-70)", margin: "0 0 14px" }}>
        Digite o e-mail que você cadastrou na clínica. (Ambiente de demonstração: sem senha nem
        código por WhatsApp ainda — isso é o próximo passo, na Fase 4 do projeto.)
      </p>
      {erro ? (
        <p style={{ color: "var(--ameixa)", fontSize: 12.5, marginBottom: 10 }} role="alert">
          {erro}
        </p>
      ) : null}
      <form onSubmit={handleSubmit} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input
          type="email"
          required
          placeholder="seu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="chip"
          style={{ flex: "1 1 220px", justifyContent: "flex-start", textAlign: "left" }}
        />
        <Button type="submit" variant="primary" disabled={enviando} aria-disabled={enviando}>
          {enviando ? "Entrando…" : "Entrar"}
        </Button>
      </form>
    </div>
  );
}
