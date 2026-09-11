"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@odontoflow/ui";
import type { StaffProfessional } from "../../../../lib/api";
import s from "../../admin.module.css";

export function EditarProfissionalForm({
  professional,
  commissionPercent,
}: {
  professional: StaffProfessional;
  commissionPercent: number;
}) {
  const router = useRouter();
  const [specialty, setSpecialty] = useState(professional.specialty ?? "");
  const [croNumber, setCroNumber] = useState(professional.croNumber ?? "");
  const [bio, setBio] = useState(professional.bio ?? "");
  const [comissao, setComissao] = useState(String(commissionPercent));
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErro(null);
    setSucesso(false);
    setEnviando(true);
    try {
      const [profRes, commissionRes] = await Promise.all([
        fetch(`/api/staff/professionals/${professional.id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ specialty: specialty || undefined, croNumber: croNumber || undefined, bio: bio || undefined }),
        }),
        fetch(`/api/staff/finance/commission-rules/${professional.id}`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ percentageBasisPoints: Math.round(Number(comissao) * 100) }),
        }),
      ]);
      if (!profRes.ok || !commissionRes.ok) {
        throw new Error("Não foi possível salvar tudo. Tente novamente.");
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
      <div className={s.campo}>
        <label className={s.rotuloCampo} htmlFor="bio">
          Frase de apresentação (aparece no agendamento público)
        </label>
        <input id="bio" className={s.input} value={bio} onChange={(e) => setBio(e.target.value)} />
      </div>
      <div className={s.campo}>
        <label className={s.rotuloCampo} htmlFor="comissao">
          Comissão automática (%)
        </label>
        <input
          id="comissao"
          type="number"
          min={0}
          max={100}
          step={0.5}
          className={s.input}
          style={{ maxWidth: 120 }}
          value={comissao}
          onChange={(e) => setComissao(e.target.value)}
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
