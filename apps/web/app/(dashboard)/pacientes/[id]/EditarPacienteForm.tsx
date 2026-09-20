"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@odontoflow/ui";
import type { Patient } from "../../../../lib/api";
import { formatarData } from "../../../../lib/datas";
import { useFusoDaClinica } from "../../FusoDaClinica";
import s from "../../admin.module.css";

export function EditarPacienteForm({ patient }: { patient: Patient }) {
  const router = useRouter();
  const [name, setName] = useState(patient.name);
  const [phone, setPhone] = useState(patient.phone ?? "");
  const [email, setEmail] = useState(patient.email ?? "");
  const [consentiu, setConsentiu] = useState(Boolean(patient.consentLGPDAt));
  const fuso = useFusoDaClinica();
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErro(null);
    setSucesso(false);
    setEnviando(true);
    try {
      const res = await fetch(`/api/staff/patients/${patient.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          phone: phone || undefined,
          email: email || undefined,
          consentLGPD: consentiu,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? "Não foi possível salvar.");
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
        <label className={s.rotuloCampo} htmlFor="name">
          Nome completo
        </label>
        <input id="name" className={s.input} value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div className={s.campo}>
        <label className={s.rotuloCampo} htmlFor="phone">
          Telefone
        </label>
        <input id="phone" className={s.input} value={phone} onChange={(e) => setPhone(e.target.value)} />
      </div>
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
        />
      </div>
      {/* Acesso ao portal do paciente.

          O login do portal exige consentimento LGPD registrado, e até aqui só
          o agendamento público gravava isso — o paciente cadastrado no balcão
          era mandado "procurar a recepção", que não tinha como resolver. O
          bloco também mostra o outro requisito (e-mail), porque de nada
          adianta consentir sem ter por onde entrar. */}
      <fieldset className={s.portalPaciente}>
        <legend className={s.rotuloCampo}>Acesso ao portal do paciente</legend>

        <label className={s.turnoChave}>
          <input
            type="checkbox"
            checked={consentiu}
            onChange={(e) => {
              setSucesso(false);
              setConsentiu(e.target.checked);
            }}
          />
          O paciente autorizou o uso dos dados dele (LGPD)
        </label>

        <p className={s.dica}>
          {patient.consentLGPDAt
            ? `Consentimento registrado em ${formatarData(patient.consentLGPDAt, fuso)}. Desmarcar revoga.`
            : "Marque só depois de o paciente autorizar de fato — a data fica registrada."}
        </p>

        {consentiu && !email ? (
          <p className={s.dica}>
            Falta o e-mail: é por ele que o paciente entra no portal.
          </p>
        ) : null}
        {!consentiu ? (
          <p className={s.dica}>
            Sem esta autorização o paciente não consegue entrar no portal.
          </p>
        ) : null}
      </fieldset>

      <div>
        <Button type="submit" variant="primary" disabled={enviando} aria-disabled={enviando}>
          {enviando ? "Salvando…" : "Salvar alterações"}
        </Button>
      </div>
    </form>
  );
}
