"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@odontoflow/ui";
import type { Anamnesis } from "../../../../../lib/api";
import s from "../../../admin.module.css";

function Checkbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

export function AnamneseForm({ patientId, initial }: { patientId: string; initial: Anamnesis }) {
  const router = useRouter();
  const [chiefComplaint, setChiefComplaint] = useState(initial?.chiefComplaint ?? "");
  const [expectedOutcome, setExpectedOutcome] = useState(initial?.expectedOutcome ?? "");

  const [hasHypertension, setHasHypertension] = useState(initial?.hasHypertension ?? false);
  const [hasDiabetes, setHasDiabetes] = useState(initial?.hasDiabetes ?? false);
  const [hasHeartCondition, setHasHeartCondition] = useState(initial?.hasHeartCondition ?? false);
  const [hasBleedingDisorder, setHasBleedingDisorder] = useState(initial?.hasBleedingDisorder ?? false);
  const [isPregnant, setIsPregnant] = useState(initial?.isPregnant ?? false);
  const [isSmoker, setIsSmoker] = useState(initial?.isSmoker ?? false);
  const [hasChronicKidneyDisease, setHasChronicKidneyDisease] = useState(
    initial?.hasChronicKidneyDisease ?? false,
  );
  const [hasCancerOrImmunosuppression, setHasCancerOrImmunosuppression] = useState(
    initial?.hasCancerOrImmunosuppression ?? false,
  );
  const [hasAllergies, setHasAllergies] = useState(initial?.hasAllergies ?? false);
  const [allergyDetails, setAllergyDetails] = useState(initial?.allergyDetails ?? "");
  const [currentMedications, setCurrentMedications] = useState(initial?.currentMedications ?? "");
  const [previousSurgeries, setPreviousSurgeries] = useState(initial?.previousSurgeries ?? "");
  const [otherHealthNotes, setOtherHealthNotes] = useState(initial?.otherHealthNotes ?? "");

  const [brushingFrequencyPerDay, setBrushingFrequencyPerDay] = useState(initial?.brushingFrequencyPerDay ?? 2);
  const [flossesRegularly, setFlossesRegularly] = useState(initial?.flossesRegularly ?? false);
  const [usesMouthwash, setUsesMouthwash] = useState(initial?.usesMouthwash ?? false);
  const [hasBruxism, setHasBruxism] = useState(initial?.hasBruxism ?? false);
  const [oralHygieneNotes, setOralHygieneNotes] = useState(initial?.oralHygieneNotes ?? "");

  const [treatmentConsent, setTreatmentConsent] = useState(!!initial?.treatmentConsentAt);
  const [imageUseConsent, setImageUseConsent] = useState(!!initial?.imageUseConsentAt);

  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErro(null);
    setSucesso(false);
    setEnviando(true);
    try {
      const res = await fetch("/api/staff/clinical-records/anamnesis", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          patientId,
          chiefComplaint: chiefComplaint || undefined,
          expectedOutcome: expectedOutcome || undefined,
          hasHypertension,
          hasDiabetes,
          hasHeartCondition,
          hasBleedingDisorder,
          isPregnant,
          isSmoker,
          hasChronicKidneyDisease,
          hasCancerOrImmunosuppression,
          hasAllergies,
          allergyDetails: allergyDetails || undefined,
          currentMedications: currentMedications || undefined,
          previousSurgeries: previousSurgeries || undefined,
          otherHealthNotes: otherHealthNotes || undefined,
          brushingFrequencyPerDay,
          flossesRegularly,
          usesMouthwash,
          hasBruxism,
          oralHygieneNotes: oralHygieneNotes || undefined,
          treatmentConsent,
          imageUseConsent,
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
        <label className={s.rotuloCampo} htmlFor="chiefComplaint">
          Motivo da consulta (queixa principal)
        </label>
        <textarea
          id="chiefComplaint"
          className={s.input}
          style={{ minHeight: 70, padding: 10 }}
          value={chiefComplaint}
          onChange={(e) => setChiefComplaint(e.target.value)}
        />
      </div>
      <div className={s.campo}>
        <label className={s.rotuloCampo} htmlFor="expectedOutcome">
          Expectativa do resultado
        </label>
        <textarea
          id="expectedOutcome"
          className={s.input}
          style={{ minHeight: 70, padding: 10 }}
          value={expectedOutcome}
          onChange={(e) => setExpectedOutcome(e.target.value)}
        />
      </div>

      <h3 style={{ fontSize: 13, fontWeight: 600, marginTop: 4 }}>Dados de saúde</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 8 }}>
        <Checkbox label="Hipertensão" checked={hasHypertension} onChange={setHasHypertension} />
        <Checkbox label="Diabetes" checked={hasDiabetes} onChange={setHasDiabetes} />
        <Checkbox label="Problema cardíaco" checked={hasHeartCondition} onChange={setHasHeartCondition} />
        <Checkbox label="Distúrbio de coagulação" checked={hasBleedingDisorder} onChange={setHasBleedingDisorder} />
        <Checkbox label="Gestante" checked={isPregnant} onChange={setIsPregnant} />
        <Checkbox label="Fumante" checked={isSmoker} onChange={setIsSmoker} />
        <Checkbox
          label="Insuficiência renal crônica"
          checked={hasChronicKidneyDisease}
          onChange={setHasChronicKidneyDisease}
        />
        <Checkbox
          label="Câncer / imunossupressão"
          checked={hasCancerOrImmunosuppression}
          onChange={setHasCancerOrImmunosuppression}
        />
        <Checkbox label="Possui alergias" checked={hasAllergies} onChange={setHasAllergies} />
      </div>
      {hasAllergies ? (
        <div className={s.campo}>
          <label className={s.rotuloCampo} htmlFor="allergyDetails">
            Quais alergias
          </label>
          <input
            id="allergyDetails"
            className={s.input}
            value={allergyDetails}
            onChange={(e) => setAllergyDetails(e.target.value)}
          />
        </div>
      ) : null}
      <div className={s.campo}>
        <label className={s.rotuloCampo} htmlFor="currentMedications">
          Medicamentos em uso
        </label>
        <input
          id="currentMedications"
          className={s.input}
          value={currentMedications}
          onChange={(e) => setCurrentMedications(e.target.value)}
        />
      </div>
      <div className={s.campo}>
        <label className={s.rotuloCampo} htmlFor="previousSurgeries">
          Cirurgias anteriores
        </label>
        <input
          id="previousSurgeries"
          className={s.input}
          value={previousSurgeries}
          onChange={(e) => setPreviousSurgeries(e.target.value)}
        />
      </div>
      <div className={s.campo}>
        <label className={s.rotuloCampo} htmlFor="otherHealthNotes">
          Outras observações de saúde
        </label>
        <input
          id="otherHealthNotes"
          className={s.input}
          value={otherHealthNotes}
          onChange={(e) => setOtherHealthNotes(e.target.value)}
        />
      </div>

      <h3 style={{ fontSize: 13, fontWeight: 600, marginTop: 4 }}>Higiene bucal</h3>
      <div className={s.campo} style={{ maxWidth: 220 }}>
        <label className={s.rotuloCampo} htmlFor="brushingFrequencyPerDay">
          Escovações por dia
        </label>
        <input
          id="brushingFrequencyPerDay"
          type="number"
          min={0}
          className={s.input}
          value={brushingFrequencyPerDay}
          onChange={(e) => setBrushingFrequencyPerDay(Number(e.target.value))}
        />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 8 }}>
        <Checkbox label="Usa fio dental regularmente" checked={flossesRegularly} onChange={setFlossesRegularly} />
        <Checkbox label="Usa enxaguante bucal" checked={usesMouthwash} onChange={setUsesMouthwash} />
        <Checkbox label="Bruxismo" checked={hasBruxism} onChange={setHasBruxism} />
      </div>
      <div className={s.campo}>
        <label className={s.rotuloCampo} htmlFor="oralHygieneNotes">
          Outras observações de higiene
        </label>
        <input
          id="oralHygieneNotes"
          className={s.input}
          value={oralHygieneNotes}
          onChange={(e) => setOralHygieneNotes(e.target.value)}
        />
      </div>

      <h3 style={{ fontSize: 13, fontWeight: 600, marginTop: 4 }}>Declaração de livre consentimento</h3>
      <p style={{ fontSize: 12.5, color: "var(--tinta-70)" }}>
        Declaro estar ciente do diagnóstico e do plano de tratamento propostos, tendo tido a oportunidade de esclarecer
        minhas dúvidas, e autorizo livremente a realização dos procedimentos recomendados.
      </p>
      <Checkbox
        label="Paciente consente livremente com o tratamento"
        checked={treatmentConsent}
        onChange={setTreatmentConsent}
      />
      <p style={{ fontSize: 12.5, color: "var(--tinta-70)" }}>
        Autorizo o uso de fotografias e imagens clínicas para fins de documentação, prontuário e acompanhamento do
        tratamento.
      </p>
      <Checkbox
        label="Paciente consente com o uso de imagem"
        checked={imageUseConsent}
        onChange={setImageUseConsent}
      />
      {initial?.treatmentConsentAt ? (
        <p style={{ fontSize: 11.5, color: "var(--tinta-55)" }}>
          Consentimento de tratamento dado em{" "}
          {new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(
            new Date(initial.treatmentConsentAt),
          )}
          .
        </p>
      ) : null}
      {initial?.imageUseConsentAt ? (
        <p style={{ fontSize: 11.5, color: "var(--tinta-55)" }}>
          Consentimento de imagem dado em{" "}
          {new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(
            new Date(initial.imageUseConsentAt),
          )}
          .
        </p>
      ) : null}

      <div>
        <Button type="submit" variant="primary" disabled={enviando} aria-disabled={enviando}>
          {enviando ? "Salvando…" : "Salvar anamnese"}
        </Button>
      </div>
    </form>
  );
}
