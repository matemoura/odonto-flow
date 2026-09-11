"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button } from "@odontoflow/ui";
import {
  ApiError,
  createPublicAppointment,
  getAvailability,
  getBookableDays,
  type AvailabilitySlot,
  type BookableDay,
  type PublicProfessional,
} from "../../../../lib/api";
import s from "./agendar.module.css";

type Step = 1 | 2 | 3;

function iniciais(nome: string) {
  return nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

export default function BookingFlow({
  clinicSlug,
  profissionais,
}: {
  clinicSlug: string;
  profissionais: PublicProfessional[];
}) {
  const [step, setStep] = useState<Step>(1);
  const [profissionalId, setProfissionalId] = useState(profissionais[0]?.id ?? "");

  const [dias, setDias] = useState<BookableDay[]>([]);
  const [diaIso, setDiaIso] = useState<string | null>(null);
  const [carregandoDias, setCarregandoDias] = useState(false);
  // Janela de dias mostrada. `inicioJanela === null` é a janela que começa
  // hoje; `janela` conta quantas semanas o paciente avançou a partir dela.
  //
  // O contador existe porque o cliente não sabe que dia é hoje NO FUSO DA
  // CLÍNICA — comparar com a data do navegador erraria para quem acessa de
  // outro fuso. Com o índice, "voltar até o começo" é `janela === 0`, sem
  // precisar de data nenhuma.
  const [inicioJanela, setInicioJanela] = useState<string | null>(null);
  const [janela, setJanela] = useState(0);

  const [horarios, setHorarios] = useState<AvailabilitySlot[]>([]);
  const [hora, setHora] = useState<string | null>(null);
  const [carregandoHorarios, setCarregandoHorarios] = useState(false);

  const [patientName, setPatientName] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [patientEmail, setPatientEmail] = useState("");
  const [consentLGPD, setConsentLGPD] = useState(false);

  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [confirmado, setConfirmado] = useState<{ startAt: string; profissional: string } | null>(null);

  /** Soma dias a uma data civil "YYYY-MM-DD" sem passar por instante/fuso. */
  function somarDiasIso(dataIso: string, dias: number) {
    const [ano, mes, dia] = dataIso.split("-").map(Number);
    const d = new Date(Date.UTC(ano, mes - 1, dia + dias));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
  }

  function irSemana(delta: 1 | -1) {
    const destino = Math.max(0, janela + delta);
    setJanela(destino);
    if (destino === 0) setInicioJanela(null);
    else if (dias[0]) setInicioJanela(somarDiasIso(dias[0].iso, delta * 7));
  }

  const profissional = profissionais.find((p) => p.id === profissionalId);
  const dia = dias.find((d) => d.iso === diaIso);

  useEffect(() => {
    if (!profissionalId) return;
    let cancelado = false;
    setCarregandoDias(true);
    setDiaIso(null);
    setHora(null);
    getBookableDays(clinicSlug, profissionalId, inicioJanela ?? undefined)
      .then((result) => {
        if (cancelado) return;
        setDias(result);
        setDiaIso(result.find((d) => d.livre)?.iso ?? null);
      })
      .catch(() => !cancelado && setErro("Não foi possível carregar os dias disponíveis."))
      .finally(() => !cancelado && setCarregandoDias(false));
    return () => {
      cancelado = true;
    };
  }, [clinicSlug, profissionalId, inicioJanela]);

  useEffect(() => {
    if (!profissionalId || !diaIso) {
      setHorarios([]);
      return;
    }
    let cancelado = false;
    setCarregandoHorarios(true);
    setHora(null);
    getAvailability(clinicSlug, profissionalId, diaIso)
      .then((result) => !cancelado && setHorarios(result))
      .catch(() => !cancelado && setErro("Não foi possível carregar os horários disponíveis."))
      .finally(() => !cancelado && setCarregandoHorarios(false));
    return () => {
      cancelado = true;
    };
  }, [clinicSlug, profissionalId, diaIso]);

  async function handleConfirmar(event: FormEvent) {
    event.preventDefault();
    if (!profissionalId || !diaIso || !hora || !consentLGPD) return;

    setEnviando(true);
    setErro(null);
    try {
      const appointment = await createPublicAppointment(clinicSlug, {
        professionalId: profissionalId,
        date: diaIso,
        time: hora,
        patientName,
        patientPhone,
        patientEmail: patientEmail || undefined,
        consentLGPD,
      });
      setConfirmado({ startAt: appointment.startAt, profissional: appointment.professional.user.name });
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setErro("Esse horário acabou de ser preenchido por outra pessoa — escolha outro.");
        setStep(2);
        getAvailability(clinicSlug, profissionalId, diaIso).then(setHorarios);
        setHora(null);
      } else {
        setErro("Não foi possível confirmar o agendamento. Tente novamente.");
      }
    } finally {
      setEnviando(false);
    }
  }

  if (confirmado) {
    const data = new Date(confirmado.startAt);
    return (
      <section className={`arco arco--alto ${s.resumo}`} aria-live="polite">
        <div>
          <span className="rotulo rotulo--acento">Consulta confirmada</span>
          <p className={s.resumoTitulo}>
            {new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "long" }).format(data)} ·{" "}
            {new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(data)}
          </p>
          <p className={s.resumoDetalhe}>
            com {confirmado.profissional} · avaliação clínica. Guarde esta confirmação — a clínica
            entra em contato se precisar remarcar.
          </p>
        </div>
      </section>
    );
  }

  return (
    <div className={s.fluxo}>
      <ol className={s.etapas} aria-label="Etapas do agendamento">
        <li className={step === 1 ? `${s.etapa} ${s.etapaAtual}` : `${s.etapa} ${s.etapaProxima}`} aria-current={step === 1 ? "step" : undefined}>
          1 · Quem atende
        </li>
        <li className={step === 2 ? `${s.etapa} ${s.etapaAtual}` : `${s.etapa} ${s.etapaProxima}`} aria-current={step === 2 ? "step" : undefined}>
          2 · Quando
        </li>
        <li className={step === 3 ? `${s.etapa} ${s.etapaAtual}` : s.etapa} aria-current={step === 3 ? "step" : undefined}>
          3 · Seus dados
        </li>
      </ol>

      {erro ? (
        <p className="chip chip--estatico chip--alerta" role="alert" style={{ display: "inline-flex" }}>
          {erro}
        </p>
      ) : null}

      {step === 1 ? (
        <fieldset className={s.grupo}>
          <legend className={s.legenda}>Escolha o profissional</legend>
          <div className={s.profissionais}>
            {profissionais.map((p) => {
              const ativo = p.id === profissionalId;
              return (
                <label key={p.id} className={ativo ? `${s.profissional} ${s.profissionalAtivo}` : s.profissional}>
                  <input
                    type="radio"
                    name="profissional"
                    value={p.id}
                    checked={ativo}
                    onChange={() => setProfissionalId(p.id)}
                    className="sr-only"
                  />
                  <span className={s.profissionalTopo}>
                    <span className={s.avatar} aria-hidden="true">
                      {iniciais(p.user.name)}
                    </span>
                    <span>
                      <strong className={s.profissionalNome}>{p.user.name}</strong>
                      <span className={s.profissionalMeta}>
                        {[p.specialty, p.croNumber].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                  </span>
                  {p.bio ? <span className={s.profissionalFala}>{p.bio}</span> : null}
                </label>
              );
            })}
          </div>
          <div className={s.resumo} style={{ marginTop: 16 }}>
            <span />
            <Button variant="primary" onClick={() => setStep(2)} disabled={!profissionalId}>
              Continuar
            </Button>
          </div>
        </fieldset>
      ) : null}

      {step === 2 ? (
        <>
          <fieldset className={s.grupo}>
            <legend className={s.legenda}>Escolha o dia</legend>
            <div className={s.semanaNav}>
              <button
                type="button"
                className="odontoflow-btn odontoflow-btn--secondary odontoflow-btn--sm"
                onClick={() => irSemana(-1)}
                disabled={carregandoDias || janela === 0}
                aria-label="Semana anterior"
              >
                ‹ Semana anterior
              </button>
              <button
                type="button"
                className="odontoflow-btn odontoflow-btn--secondary odontoflow-btn--sm"
                onClick={() => irSemana(1)}
                disabled={carregandoDias || dias.length === 0}
                aria-label="Próxima semana"
              >
                Próxima semana ›
              </button>
            </div>
            {carregandoDias ? (
              <p className={s.profissionalMeta}>Carregando dias…</p>
            ) : (
              <div className={s.dias}>
                {dias.map((d) => (
                  <button
                    key={d.iso}
                    type="button"
                    className="dia"
                    aria-pressed={d.iso === diaIso}
                    disabled={!d.livre}
                    onClick={() => setDiaIso(d.iso)}
                  >
                    <span className="dia__semana">{d.semana}</span>
                    <span className="dia__numero">{d.numero}</span>
                    {!d.livre ? <span className="sr-only">sem horários</span> : null}
                  </button>
                ))}
              </div>
            )}
          </fieldset>

          <fieldset className={s.grupo}>
            <legend className={s.legenda}>Escolha o horário</legend>
            {carregandoHorarios ? (
              <p className={s.profissionalMeta}>Carregando horários…</p>
            ) : horarios.length === 0 ? (
              <p className={s.profissionalMeta}>Sem horários para este dia.</p>
            ) : (
              <div className={s.horarios}>
                {horarios.map((h) => (
                  <button
                    key={h.hora}
                    type="button"
                    className="chip"
                    aria-pressed={h.hora === hora}
                    disabled={!h.livre}
                    onClick={() => setHora(h.hora)}
                  >
                    {h.hora}
                    {!h.livre ? <span className="sr-only">indisponível</span> : null}
                  </button>
                ))}
              </div>
            )}
          </fieldset>

          <section className={`arco arco--alto ${s.resumo}`} aria-live="polite">
            <div>
              <span className="rotulo rotulo--acento">Seu horário</span>
              <p className={s.resumoTitulo}>
                {dia ? `${dia.semana}, ${dia.numero}` : "escolha um dia"}
                {hora ? ` · ${hora}` : ""}
              </p>
              <p className={s.resumoDetalhe}>
                {profissional ? `com ${profissional.user.name}` : ""} · avaliação clínica
              </p>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Button variant="ghost" onClick={() => setStep(1)}>
                Voltar
              </Button>
              <Button variant="primary" onClick={() => setStep(3)} disabled={!dia || !hora}>
                Continuar
              </Button>
            </div>
          </section>
        </>
      ) : null}

      {step === 3 ? (
        <form onSubmit={handleConfirmar} className={s.grupo}>
          <fieldset className={s.grupo} style={{ marginBottom: 16 }}>
            <legend className={s.legenda}>Seus dados</legend>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <input
                required
                placeholder="Nome completo"
                className="chip"
                style={{ justifyContent: "flex-start", width: "100%", textAlign: "left" }}
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
              />
              <input
                required
                placeholder="WhatsApp/telefone"
                className="chip"
                style={{ justifyContent: "flex-start", width: "100%", textAlign: "left" }}
                value={patientPhone}
                onChange={(e) => setPatientPhone(e.target.value)}
              />
              <input
                type="email"
                placeholder="E-mail (opcional)"
                className="chip"
                style={{ justifyContent: "flex-start", width: "100%", textAlign: "left" }}
                value={patientEmail}
                onChange={(e) => setPatientEmail(e.target.value)}
              />
              <label style={{ display: "flex", gap: 8, fontSize: 12.5, alignItems: "flex-start" }}>
                <input
                  type="checkbox"
                  checked={consentLGPD}
                  onChange={(e) => setConsentLGPD(e.target.checked)}
                  required
                  style={{ marginTop: 2 }}
                />
                Aceito que meus dados sejam usados por esta clínica para agendar e confirmar minha
                consulta (LGPD).
              </label>
            </div>
          </fieldset>

          <section className={`arco arco--alto ${s.resumo}`}>
            <div>
              <span className="rotulo rotulo--acento">Confirmar</span>
              <p className={s.resumoTitulo}>
                {dia ? `${dia.semana}, ${dia.numero}` : ""} · {hora}
              </p>
              <p className={s.resumoDetalhe}>
                {profissional ? `com ${profissional.user.name}` : ""} · avaliação clínica
              </p>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Button type="button" variant="ghost" onClick={() => setStep(2)} disabled={enviando}>
                Voltar
              </Button>
              <Button type="submit" variant="primary" disabled={enviando || !consentLGPD} aria-disabled={enviando}>
                {enviando ? "Confirmando…" : "Confirmar agendamento"}
              </Button>
            </div>
          </section>
        </form>
      ) : null}

      <p className="sr-only">Clínica: {clinicSlug}</p>
    </div>
  );
}
