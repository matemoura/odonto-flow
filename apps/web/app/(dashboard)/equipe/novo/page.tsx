"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@odontoflow/ui";
import type { TeamRole } from "../../../../lib/api";
import s from "../../admin.module.css";

export default function NovoMembroPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<TeamRole>("ASSISTANT");
  const [specialty, setSpecialty] = useState("");
  const [croNumber, setCroNumber] = useState("");
  // Admin que também atende: mantém o acesso de administrador e ganha ficha de
  // profissional, passando a aparecer na agenda e no agendamento público.
  const [atendePacientes, setAtendePacientes] = useState(false);
  const atende = role === "DENTIST" || atendePacientes;
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      const res = await fetch("/api/staff/team", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password: password || undefined,
          role,
          atendePacientes: atendePacientes || undefined,
          specialty: atende ? specialty || undefined : undefined,
          croNumber: atende ? croNumber || undefined : undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? "Não foi possível adicionar este membro.");
      }
      router.push("/equipe");
      router.refresh();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível adicionar este membro.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className={s.pagina}>
      <h1 className={s.titulo}>Novo membro da equipe</h1>
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
          <label className={s.rotuloCampo} htmlFor="role">
            Cargo
          </label>
          <select
            id="role"
            className={s.input}
            value={role}
            onChange={(e) => setRole(e.target.value as TeamRole)}
          >
            <option value="ASSISTANT">Assistente</option>
            <option value="DENTIST">Dentista</option>
            <option value="CLINIC_ADMIN">Administrador(a)</option>
          </select>
        </div>
        {role === "CLINIC_ADMIN" ? (
          <div className={s.campo}>
            <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 13 }}>
              <input
                type="checkbox"
                checked={atendePacientes}
                onChange={(e) => setAtendePacientes(e.target.checked)}
                style={{ marginTop: 3 }}
              />
              <span>
                Também atende pacientes
                <span style={{ display: "block", fontSize: 12, color: "var(--tinta-55)" }}>
                  Continua com acesso de administrador e passa a aparecer na agenda e no agendamento
                  público.
                </span>
              </span>
            </label>
          </div>
        ) : null}
        {atende ? (
          <>
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
          </>
        ) : null}
        <div>
          <Button type="submit" variant="primary" disabled={enviando} aria-disabled={enviando}>
            {enviando ? "Salvando…" : "Adicionar à equipe"}
          </Button>
        </div>
      </form>
    </div>
  );
}
