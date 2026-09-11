"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@odontoflow/ui";
import type { OrganizationClinic, Patient } from "../../../lib/api";
import s from "../admin.module.css";

export function TransferPatientForm({ patients, clinics }: { patients: Patient[]; clinics: OrganizationClinic[] }) {
  const router = useRouter();
  const [patientId, setPatientId] = useState(patients[0]?.id ?? "");
  const [toClinicId, setToClinicId] = useState(clinics[0]?.id ?? "");
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErro(null);
    setSucesso(null);
    setEnviando(true);
    try {
      const res = await fetch("/api/staff/organizations/transfer-patient", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ patientId, toClinicId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message ?? "Não foi possível transferir.");
      setSucesso("Paciente transferido.");
      router.refresh();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível transferir.");
    } finally {
      setEnviando(false);
    }
  }

  if (patients.length === 0 || clinics.length === 0) {
    return (
      <section style={{ maxWidth: 420 }}>
        <h2 style={{ fontSize: 14, fontWeight: 600 }}>Transferir paciente entre unidades</h2>
        <p className={s.vazio}>
          {patients.length === 0 ? "Nenhum paciente nesta clínica." : "Nenhuma outra unidade na rede."}
        </p>
      </section>
    );
  }

  return (
    <section style={{ maxWidth: 420 }}>
      <h2 style={{ fontSize: 14, fontWeight: 600 }}>Transferir paciente entre unidades</h2>
      <form onSubmit={handleSubmit} className={s.form}>
        {erro ? (
          <p className={s.erro} role="alert">
            {erro}
          </p>
        ) : null}
        {sucesso ? <p className={s.sucesso}>{sucesso}</p> : null}
        <div className={s.campo}>
          <label className={s.rotuloCampo}>Paciente (desta clínica)</label>
          <select className={s.input} value={patientId} onChange={(e) => setPatientId(e.target.value)}>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className={s.campo}>
          <label className={s.rotuloCampo}>Unidade de destino</label>
          <select className={s.input} value={toClinicId} onChange={(e) => setToClinicId(e.target.value)}>
            {clinics.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" variant="primary" disabled={enviando} style={{ alignSelf: "flex-start" }}>
          {enviando ? "Transferindo…" : "Transferir"}
        </Button>
      </form>
    </section>
  );
}
