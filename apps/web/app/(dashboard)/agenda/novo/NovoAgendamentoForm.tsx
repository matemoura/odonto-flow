"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@odontoflow/ui";
import type { Patient, StaffProfessional } from "../../../../lib/api";
import s from "../../admin.module.css";

export function NovoAgendamentoForm({
  patients,
  professionals,
}: {
  patients: Patient[];
  professionals: StaffProfessional[];
}) {
  const router = useRouter();
  const [patientId, setPatientId] = useState("");
  const [professionalId, setProfessionalId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("30");
  const [notes, setNotes] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      const res = await fetch("/api/agenda/appointments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          patientId,
          professionalId,
          startAt: new Date(`${date}T${time}`).toISOString(),
          durationMinutes: Number(durationMinutes),
          notes: notes || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? "Não foi possível agendar.");
      }
      router.push("/agenda");
      router.refresh();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível agendar.");
    } finally {
      setEnviando(false);
    }
  }

  if (patients.length === 0 || professionals.length === 0) {
    return (
      <p className={s.vazio}>
        É preciso ter ao menos um paciente e um profissional cadastrados para agendar.{" "}
        {patients.length === 0 ? <Link href="/pacientes/novo">Cadastrar paciente</Link> : null}
        {patients.length === 0 && professionals.length === 0 ? " · " : null}
        {professionals.length === 0 ? <Link href="/profissionais/novo">Cadastrar profissional</Link> : null}
      </p>
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
        <select
          id="patientId"
          className={s.input}
          value={patientId}
          onChange={(e) => setPatientId(e.target.value)}
          required
        >
          <option value="">Selecione…</option>
          {patients.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <div className={s.campo}>
        <label className={s.rotuloCampo} htmlFor="professionalId">
          Profissional
        </label>
        <select
          id="professionalId"
          className={s.input}
          value={professionalId}
          onChange={(e) => setProfessionalId(e.target.value)}
          required
        >
          <option value="">Selecione…</option>
          {professionals.map((p) => (
            <option key={p.id} value={p.id}>
              {p.user.name}
              {p.specialty ? ` — ${p.specialty}` : ""}
            </option>
          ))}
        </select>
      </div>

      <div className={s.campo}>
        <label className={s.rotuloCampo} htmlFor="date">
          Data
        </label>
        <input
          id="date"
          type="date"
          className={s.input}
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />
      </div>

      <div className={s.campo}>
        <label className={s.rotuloCampo} htmlFor="time">
          Horário
        </label>
        <input
          id="time"
          type="time"
          className={s.input}
          value={time}
          onChange={(e) => setTime(e.target.value)}
          required
        />
      </div>

      <div className={s.campo}>
        <label className={s.rotuloCampo} htmlFor="durationMinutes">
          Duração (minutos)
        </label>
        <input
          id="durationMinutes"
          type="number"
          min={10}
          max={240}
          step={5}
          className={s.input}
          value={durationMinutes}
          onChange={(e) => setDurationMinutes(e.target.value)}
          required
        />
      </div>

      <div className={s.campo}>
        <label className={s.rotuloCampo} htmlFor="notes">
          Observações
        </label>
        <input id="notes" className={s.input} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <Button type="submit" variant="primary" disabled={enviando} aria-disabled={enviando}>
          {enviando ? "Agendando…" : "Agendar"}
        </Button>
        <Link href="/agenda" className="odontoflow-btn odontoflow-btn--secondary">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
