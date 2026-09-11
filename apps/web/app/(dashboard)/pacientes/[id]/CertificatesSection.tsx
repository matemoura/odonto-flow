"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@odontoflow/ui";
import type { Certificate, StaffProfessional } from "../../../../lib/api";
import s from "../../admin.module.css";

const TYPE_LABEL: Record<Certificate["type"], string> = {
  ATTENDANCE: "Comparecimento",
  MEDICAL: "Médico",
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function CertificateCard({ certificate }: { certificate: Certificate }) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [excluindo, setExcluindo] = useState(false);

  const beneficiaryLabel =
    certificate.beneficiary === "COMPANION" ? `Acompanhante — ${certificate.companionName}` : "Paciente";

  async function handleExcluir() {
    if (!window.confirm("Excluir este atestado?")) return;
    setErro(null);
    setExcluindo(true);
    try {
      const res = await fetch(`/api/staff/certificates/${certificate.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      setErro("Falha ao excluir.");
      setExcluindo(false);
    }
  }

  return (
    <div
      style={{
        padding: 12,
        background: "var(--gaze)",
        borderRadius: "var(--r-md)",
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
        <strong style={{ fontSize: 13 }}>Atestado de {TYPE_LABEL[certificate.type]}</strong>
        <span className="chip chip--estatico">{beneficiaryLabel}</span>
      </div>
      <span style={{ fontSize: 12.5 }}>
        Visita em {new Intl.DateTimeFormat("pt-BR").format(new Date(certificate.visitDate))} — emitido por{" "}
        {certificate.professional.user.name}
      </span>
      {certificate.type === "MEDICAL" ? (
        <span style={{ fontSize: 12.5 }}>{certificate.daysOff} dia(s) de afastamento</span>
      ) : null}
      {erro ? (
        <p className={s.erro} role="alert">
          {erro}
        </p>
      ) : null}
      <div style={{ display: "flex", gap: 6 }}>
        <a
          href={`/atestados/${certificate.id}`}
          target="_blank"
          rel="noreferrer"
          className="odontoflow-btn odontoflow-btn--secondary odontoflow-btn--sm"
        >
          Imprimir
        </a>
        <button
          type="button"
          className="odontoflow-btn odontoflow-btn--ghost odontoflow-btn--sm"
          disabled={excluindo}
          onClick={handleExcluir}
        >
          Excluir
        </button>
      </div>
    </div>
  );
}

export function CertificatesSection({
  patientId,
  certificates,
  professionals,
}: {
  patientId: string;
  certificates: Certificate[];
  professionals: StaffProfessional[];
}) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [type, setType] = useState<Certificate["type"]>("ATTENDANCE");
  const [beneficiary, setBeneficiary] = useState<Certificate["beneficiary"]>("PATIENT");
  const [companionName, setCompanionName] = useState("");
  const [professionalId, setProfessionalId] = useState(professionals[0]?.id ?? "");
  const [visitDate, setVisitDate] = useState(todayIso());
  const [arrivalTime, setArrivalTime] = useState("");
  const [departureTime, setDepartureTime] = useState("");
  const [daysOff, setDaysOff] = useState(1);
  const [cidCode, setCidCode] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      const res = await fetch("/api/staff/certificates", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          patientId,
          professionalId,
          type,
          beneficiary,
          companionName: beneficiary === "COMPANION" ? companionName : undefined,
          visitDate,
          arrivalTime: type === "ATTENDANCE" ? arrivalTime || undefined : undefined,
          departureTime: type === "ATTENDANCE" ? departureTime || undefined : undefined,
          daysOff: type === "MEDICAL" ? daysOff : undefined,
          cidCode: type === "MEDICAL" ? cidCode || undefined : undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? "Não foi possível emitir o atestado.");
      }
      const created = await res.json();
      setAberto(false);
      setCompanionName("");
      setArrivalTime("");
      setDepartureTime("");
      setCidCode("");
      router.refresh();
      window.open(`/atestados/${created.id}`, "_blank");
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível emitir o atestado.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section className={s.bloco}>
      <h2 style={{ fontSize: 14, fontWeight: 600 }}>Atestados</h2>

      {certificates.length === 0 ? (
        <p className={s.vazio}>Nenhum atestado emitido ainda.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {certificates.map((c) => (
            <CertificateCard key={c.id} certificate={c} />
          ))}
        </div>
      )}

      {!aberto ? (
        <Button
          variant="primary"
          onClick={() => setAberto(true)}
          style={{ alignSelf: "flex-start" }}
          disabled={!professionalId}
        >
          + Novo atestado
        </Button>
      ) : (
        <form onSubmit={handleSubmit} className={s.form}>
          {erro ? (
            <p className={s.erro} role="alert">
              {erro}
            </p>
          ) : null}

          <div className={s.campo}>
            <label className={s.rotuloCampo}>Tipo de atestado</label>
            <select className={s.input} value={type} onChange={(e) => setType(e.target.value as Certificate["type"])}>
              <option value="ATTENDANCE">Comparecimento</option>
              <option value="MEDICAL">Médico</option>
            </select>
          </div>

          <div className={s.campo}>
            <label className={s.rotuloCampo}>Para quem</label>
            <select
              className={s.input}
              value={beneficiary}
              onChange={(e) => setBeneficiary(e.target.value as Certificate["beneficiary"])}
            >
              <option value="PATIENT">Paciente</option>
              <option value="COMPANION">Acompanhante</option>
            </select>
          </div>
          {beneficiary === "COMPANION" ? (
            <div className={s.campo}>
              <label className={s.rotuloCampo}>Nome do acompanhante</label>
              <input
                className={s.input}
                value={companionName}
                onChange={(e) => setCompanionName(e.target.value)}
                required
              />
            </div>
          ) : null}

          <div className={s.campo}>
            <label className={s.rotuloCampo}>Profissional</label>
            <select className={s.input} value={professionalId} onChange={(e) => setProfessionalId(e.target.value)}>
              {professionals.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.user.name}
                </option>
              ))}
            </select>
          </div>

          <div className={s.campo}>
            <label className={s.rotuloCampo}>Data da visita</label>
            <input
              type="date"
              className={s.input}
              value={visitDate}
              onChange={(e) => setVisitDate(e.target.value)}
              required
            />
          </div>

          {type === "ATTENDANCE" ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
              <div className={s.campo}>
                <label className={s.rotuloCampo}>Horário de chegada</label>
                <input
                  type="time"
                  className={s.input}
                  value={arrivalTime}
                  onChange={(e) => setArrivalTime(e.target.value)}
                />
              </div>
              <div className={s.campo}>
                <label className={s.rotuloCampo}>Horário de saída</label>
                <input
                  type="time"
                  className={s.input}
                  value={departureTime}
                  onChange={(e) => setDepartureTime(e.target.value)}
                />
              </div>
            </div>
          ) : (
            <>
              <div className={s.campo} style={{ maxWidth: 160 }}>
                <label className={s.rotuloCampo}>Dias de afastamento</label>
                <input
                  type="number"
                  min={1}
                  className={s.input}
                  value={daysOff}
                  onChange={(e) => setDaysOff(Number(e.target.value))}
                  required
                />
              </div>
              <div className={s.campo}>
                <label className={s.rotuloCampo}>CID (opcional)</label>
                <input className={s.input} value={cidCode} onChange={(e) => setCidCode(e.target.value)} />
              </div>
            </>
          )}

          <div style={{ display: "flex", gap: 8 }}>
            <Button type="submit" variant="primary" disabled={enviando}>
              {enviando ? "Emitindo…" : "Emitir atestado"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setAberto(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
