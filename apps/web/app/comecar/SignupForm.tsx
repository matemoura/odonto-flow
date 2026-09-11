"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@odontoflow/ui";
import s from "../entrar/entrar.module.css";

const PLANOS: Record<string, string> = { basic: "Basic", plus: "Plus", pro: "Pro" };

export function slugify(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // remove acentos (á -> a, ç -> c, ...)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const plano = searchParams.get("plano");

  const [clinicName, setClinicName] = useState("");
  const [clinicSlug, setClinicSlug] = useState("");
  const [slugEditadoManualmente, setSlugEditadoManualmente] = useState(false);
  // "indisponivel" = não deu para verificar (API fora do ar, URL errada). É um
  // estado próprio de propósito: antes, qualquer falha caía em "ocupado" e a
  // tela dizia "já em uso" para QUALQUER nome — uma resposta confiante e errada
  // que escondia o problema real.
  const [disponibilidade, setDisponibilidade] = useState<
    "checando" | "livre" | "ocupado" | "indisponivel" | null
  >(null);
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!clinicSlug) {
      setDisponibilidade(null);
      return;
    }
    setDisponibilidade("checando");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/signup/disponibilidade?slug=${encodeURIComponent(clinicSlug)}`);
        if (!res.ok) {
          setDisponibilidade("indisponivel");
          return;
        }
        const data = await res.json();
        setDisponibilidade(data.available ? "livre" : "ocupado");
      } catch {
        setDisponibilidade("indisponivel");
      }
    }, 450);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [clinicSlug]);

  function handleClinicNameChange(value: string) {
    setClinicName(value);
    if (!slugEditadoManualmente) {
      setClinicSlug(slugify(value));
    }
  }

  function handleSlugChange(value: string) {
    setSlugEditadoManualmente(true);
    setClinicSlug(slugify(value));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      const res = await fetch("/api/session/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          clinicName,
          clinicSlug,
          adminName,
          adminEmail,
          adminPassword,
          plan: plano ?? undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message ?? "Não foi possível criar sua conta.");
      router.push("/agenda");
      router.refresh();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível criar sua conta.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className={s.folha} style={{ maxWidth: 420 }}>
      <h1 className={s.marca}>Odonto Flow</h1>
      <p className={s.subtitulo}>
        Crie a conta da sua clínica{plano && PLANOS[plano] ? ` — plano ${PLANOS[plano]}` : ""}. Leva menos de um
        minuto.
      </p>

      {erro ? (
        <p className={s.erro} role="alert">
          {erro}
        </p>
      ) : null}

      <form onSubmit={handleSubmit}>
        <div className={s.campo}>
          <label className={s.rotuloCampo} htmlFor="clinicName">
            Nome da clínica
          </label>
          <input
            id="clinicName"
            className={s.input}
            value={clinicName}
            onChange={(e) => handleClinicNameChange(e.target.value)}
            placeholder="Clínica Sorriso"
            autoFocus
            required
          />
        </div>
        <div className={s.campo}>
          <label className={s.rotuloCampo} htmlFor="clinicSlug">
            Link da sua clínica
          </label>
          <input
            id="clinicSlug"
            className={s.input}
            value={clinicSlug}
            onChange={(e) => handleSlugChange(e.target.value)}
            placeholder="clinica-sorriso"
            required
          />
          <span style={{ fontSize: 11.5, color: "var(--tinta-55)" }}>
            odontoflow.app/entrar/{clinicSlug || "..."}
            {disponibilidade === "checando" ? " · checando…" : null}
            {disponibilidade === "livre" ? (
              <span style={{ color: "#38715c", fontWeight: 600 }}> · disponível</span>
            ) : null}
            {disponibilidade === "ocupado" ? (
              <span style={{ color: "var(--ameixa)", fontWeight: 600 }}> · já em uso, escolha outro</span>
            ) : null}
            {disponibilidade === "indisponivel" ? (
              <span style={{ color: "var(--tinta-70)" }}> · não deu para verificar agora</span>
            ) : null}
          </span>
        </div>
        <div className={s.campo}>
          <label className={s.rotuloCampo} htmlFor="adminName">
            Seu nome
          </label>
          <input
            id="adminName"
            className={s.input}
            value={adminName}
            onChange={(e) => setAdminName(e.target.value)}
            required
          />
        </div>
        <div className={s.campo}>
          <label className={s.rotuloCampo} htmlFor="adminEmail">
            Seu e-mail
          </label>
          <input
            id="adminEmail"
            type="email"
            className={s.input}
            value={adminEmail}
            onChange={(e) => setAdminEmail(e.target.value)}
            autoComplete="username"
            required
          />
        </div>
        <div className={s.campo}>
          <label className={s.rotuloCampo} htmlFor="adminPassword">
            Senha
          </label>
          <input
            id="adminPassword"
            type="password"
            className={s.input}
            value={adminPassword}
            onChange={(e) => setAdminPassword(e.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
          />
        </div>
        <div className={s.acoes}>
          <Button type="submit" variant="primary" disabled={enviando || disponibilidade === "ocupado"}>
            {enviando ? "Criando conta…" : "Criar minha conta"}
          </Button>
        </div>
      </form>

      <p className={s.rodape}>
        Sem cartão de crédito agora. Prefere conversar antes?{" "}
        <a href="/planos">Fale com a gente</a>.
      </p>
    </div>
  );
}
