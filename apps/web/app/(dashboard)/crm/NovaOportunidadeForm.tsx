"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@odontoflow/ui";
import type { Patient, StaffProfessional } from "../../../lib/api";
import s from "../admin.module.css";

export function NovaOportunidadeForm({
  patients,
  professionals,
}: {
  patients: Patient[];
  professionals: StaffProfessional[];
}) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [patientId, setPatientId] = useState(patients[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      const res = await fetch("/api/staff/crm/opportunities", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ patientId, title, ownerId: ownerId || undefined }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? "Não foi possível salvar.");
      }
      setTitle("");
      setAberto(false);
      router.refresh();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível salvar.");
    } finally {
      setEnviando(false);
    }
  }

  if (!aberto) {
    return (
      <Button variant="primary" onClick={() => setAberto(true)} style={{ alignSelf: "flex-start" }}>
        + Nova oportunidade
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={s.form}>
      {erro ? (
        <p className={s.erro} role="alert">
          {erro}
        </p>
      ) : null}
      <div className={s.campo}>
        <label className={s.rotuloCampo} htmlFor="patientId">
          Paciente
        </label>
        <select id="patientId" className={s.input} value={patientId} onChange={(e) => setPatientId(e.target.value)}>
          {patients.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
      <div className={s.campo}>
        <label className={s.rotuloCampo} htmlFor="title">
          O que está em jogo?
        </label>
        <input
          id="title"
          className={s.input}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex.: Avaliação de implante"
          required
        />
      </div>
      <div className={s.campo}>
        <label className={s.rotuloCampo} htmlFor="ownerId">
          Responsável
        </label>
        <select id="ownerId" className={s.input} value={ownerId} onChange={(e) => setOwnerId(e.target.value)}>
          <option value="">Ninguém ainda</option>
          {professionals.map((p) => (
            <option key={p.id} value={p.id}>
              {p.user.name}
            </option>
          ))}
        </select>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <Button type="submit" variant="primary" disabled={enviando} aria-disabled={enviando}>
          {enviando ? "Salvando…" : "Salvar"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setAberto(false)}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
