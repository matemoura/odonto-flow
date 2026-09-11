"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@odontoflow/ui";
import s from "../admin.module.css";

export function CreateOrJoinOrganization() {
  const router = useRouter();
  const [modo, setModo] = useState<"create" | "join">("create");
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      const res = await fetch(modo === "create" ? "/api/staff/organizations" : "/api/staff/organizations/join", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(modo === "create" ? { name, slug } : { organizationId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message ?? "Não foi possível concluir.");
      router.refresh();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível concluir.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 420 }}>
      <div style={{ display: "flex", gap: 6 }}>
        <Button
          variant={modo === "create" ? "primary" : "ghost"}
          className="odontoflow-btn--sm"
          onClick={() => setModo("create")}
        >
          Criar rede
        </Button>
        <Button
          variant={modo === "join" ? "primary" : "ghost"}
          className="odontoflow-btn--sm"
          onClick={() => setModo("join")}
        >
          Entrar numa rede
        </Button>
      </div>

      <form onSubmit={handleSubmit} className={s.form}>
        {erro ? (
          <p className={s.erro} role="alert">
            {erro}
          </p>
        ) : null}

        {modo === "create" ? (
          <>
            <div className={s.campo}>
              <label className={s.rotuloCampo}>Nome da rede</label>
              <input className={s.input} value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className={s.campo}>
              <label className={s.rotuloCampo}>Identificador (slug, sem espaços)</label>
              <input
                className={s.input}
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="ex.: grupo-sorriso"
                required
              />
            </div>
          </>
        ) : (
          <div className={s.campo}>
            <label className={s.rotuloCampo}>Código da rede (ID informado pelo administrador)</label>
            <input
              className={s.input}
              value={organizationId}
              onChange={(e) => setOrganizationId(e.target.value)}
              required
            />
          </div>
        )}

        <Button type="submit" variant="primary" disabled={enviando} style={{ alignSelf: "flex-start" }}>
          {enviando ? "Enviando…" : modo === "create" ? "Criar rede" : "Entrar na rede"}
        </Button>
      </form>
    </div>
  );
}
