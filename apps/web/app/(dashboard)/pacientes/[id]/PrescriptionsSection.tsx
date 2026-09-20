"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@odontoflow/ui";
import type { Anamnesis, Medication, Prescription, Procedure, RiskFlag } from "../../../../lib/api";
import { RISK_FLAG_LABEL } from "../../../../lib/api";
import s from "../../admin.module.css";
import { formatarDataHora } from "../../../../lib/datas";
import { useFusoDaClinica } from "../../FusoDaClinica";
import { FalhaAoCarregar } from "./FalhaAoCarregar";

type ItemRascunho = {
  key: string;
  medicationId?: string;
  medicationName: string;
  posology: string;
  instructions: string;
};

/** As mesmas flags marcadas na anamnese do paciente, na forma do enum `RiskFlag`. */
function riskFlagsDaAnamnese(anamnesis: Anamnesis): RiskFlag[] {
  if (!anamnesis) return [];
  const flags: RiskFlag[] = [];
  if (anamnesis.hasHypertension) flags.push("HYPERTENSION");
  if (anamnesis.hasDiabetes) flags.push("DIABETES");
  if (anamnesis.hasHeartCondition) flags.push("HEART_CONDITION");
  if (anamnesis.hasBleedingDisorder) flags.push("BLEEDING_DISORDER");
  if (anamnesis.isPregnant) flags.push("PREGNANT");
  if (anamnesis.hasChronicKidneyDisease) flags.push("CHRONIC_KIDNEY_DISEASE");
  if (anamnesis.hasCancerOrImmunosuppression) flags.push("CANCER_OR_IMMUNOSUPPRESSION");
  return flags;
}

function novoItem(): ItemRascunho {
  return { key: Math.random().toString(36).slice(2), medicationId: undefined, medicationName: "", posology: "", instructions: "" };
}

function PrescriptionCard({ prescription }: { prescription: Prescription }) {
  const fuso = useFusoDaClinica();
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
      <strong style={{ fontSize: 13 }}>{prescription.items.map((i) => i.medicationName).join(", ")}</strong>
      <span style={{ fontSize: 12.5 }}>
        {formatarDataHora(prescription.createdAt, fuso)} — {prescription.professional.user.name}
      </span>
      <div>
        <a
          href={`/receitas/${prescription.id}`}
          target="_blank"
          rel="noreferrer"
          className="odontoflow-btn odontoflow-btn--secondary odontoflow-btn--sm"
        >
          Imprimir
        </a>
      </div>
    </div>
  );
}

export function PrescriptionsSection({
  patientId,
  prescriptions,
  procedures,
  medications,
  anamnesis,
}: {
  patientId: string;
  prescriptions: Prescription[] | null;
  procedures: Procedure[] | null;
  medications: Medication[] | null;
  anamnesis: Anamnesis;
}) {
  const router = useRouter();
  const procedimentosDisponiveis = procedures ?? [];
  const medicamentosDisponiveis = medications ?? [];
  const flagsDoPaciente = useMemo(() => new Set(riskFlagsDaAnamnese(anamnesis)), [anamnesis]);

  const [aberto, setAberto] = useState(false);
  const [procedureId, setProcedureId] = useState("");
  const [medicationId, setMedicationId] = useState(medicamentosDisponiveis[0]?.id ?? "");
  const [notes, setNotes] = useState("");
  const [itens, setItens] = useState<ItemRascunho[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  function aplicarModeloDoServico(novoProcedureId: string) {
    setProcedureId(novoProcedureId);
    const procedimento = procedimentosDisponiveis.find((p) => p.id === novoProcedureId);
    if (!procedimento) return;
    setItens(
      procedimento.prescriptionItems.map((item) => ({
        key: item.id,
        medicationId: item.medicationId ?? undefined,
        medicationName: item.medication?.name ?? item.customName ?? "",
        posology: item.posology,
        instructions: item.instructions ?? "",
      })),
    );
  }

  function adicionarItem() {
    const medicamento = medicamentosDisponiveis.find((m) => m.id === medicationId);
    setItens((atual) => [
      ...atual,
      {
        ...novoItem(),
        medicationId: medicamento?.id,
        medicationName: medicamento?.name ?? "",
        posology: medicamento?.defaultPosology ?? "",
      },
    ]);
  }

  function atualizarItem(key: string, campo: "medicationName" | "posology" | "instructions", valor: string) {
    setItens((atual) => atual.map((item) => (item.key === key ? { ...item, [campo]: valor } : item)));
  }

  function removerItem(key: string) {
    setItens((atual) => atual.filter((item) => item.key !== key));
  }

  // Avisos calculados no cliente, a partir do catálogo já carregado — dão
  // retorno na hora, item por item, sem round-trip. O servidor recalcula (e
  // congela) os avisos de verdade na emissão, então isto aqui é só a prévia.
  const avisos = itens.flatMap((item) => {
    const medicamento = item.medicationId ? medicamentosDisponiveis.find((m) => m.id === item.medicationId) : null;
    if (!medicamento) return [];
    return medicamento.riskNotes
      .filter((nota) => flagsDoPaciente.has(nota.riskFlag))
      .map((nota) => ({
        medicationName: medicamento.name,
        severity: nota.severity,
        riskFlag: nota.riskFlag,
        note: nota.note,
      }));
  });

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErro(null);
    if (itens.length === 0) {
      setErro("Adicione ao menos um medicamento.");
      return;
    }
    if (itens.some((item) => !item.medicationName.trim() || !item.posology.trim())) {
      setErro("Todo item precisa de nome e posologia.");
      return;
    }
    setEnviando(true);
    try {
      const res = await fetch("/api/staff/prescriptions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          patientId,
          procedureId: procedureId || undefined,
          notes: notes.trim() || undefined,
          items: itens.map((item) => ({
            medicationId: item.medicationId,
            customName: item.medicationId ? undefined : item.medicationName.trim(),
            posology: item.posology.trim(),
            instructions: item.instructions.trim() || undefined,
          })),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(Array.isArray(data.message) ? data.message[0] : (data.message ?? "Não foi possível emitir a receita."));
      }
      const created = await res.json();
      setAberto(false);
      setProcedureId("");
      setItens([]);
      setNotes("");
      router.refresh();
      window.open(`/receitas/${created.id}`, "_blank");
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível emitir a receita.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section className={s.bloco}>
      <h2 style={{ fontSize: 14, fontWeight: 600 }}>Receitas</h2>

      {prescriptions === null ? (
        <FalhaAoCarregar oQue="as receitas" />
      ) : prescriptions.length === 0 ? (
        <p className={s.vazio}>Nenhuma receita emitida ainda.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {prescriptions.map((p) => (
            <PrescriptionCard key={p.id} prescription={p} />
          ))}
        </div>
      )}

      {!aberto ? (
        <Button variant="primary" onClick={() => setAberto(true)} style={{ alignSelf: "flex-start" }}>
          + Nova receita
        </Button>
      ) : (
        <form onSubmit={handleSubmit} className={s.form}>
          {erro ? (
            <p className={s.erro} role="alert">
              {erro}
            </p>
          ) : null}

          <div className={s.campo}>
            <label className={s.rotuloCampo}>Serviço (pré-preenche a receita padrão)</label>
            <select className={s.input} value={procedureId} onChange={(e) => aplicarModeloDoServico(e.target.value)}>
              <option value="">— Escolher a partir de um serviço —</option>
              {procedimentosDisponiveis.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {avisos.length > 0 ? (
            <div
              role="alert"
              style={{
                gridColumn: "1 / -1",
                padding: "10px 12px",
                borderRadius: "var(--r-sm)",
                background: "var(--areia)",
                color: "#6b4e17",
                fontSize: 12.5,
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              {avisos.map((aviso, index) => (
                <span key={index}>
                  <strong>{aviso.severity === "AVOID" ? "Evitar" : "Cautela"}:</strong> {aviso.medicationName} — paciente
                  com {RISK_FLAG_LABEL[aviso.riskFlag]}. {aviso.note}
                </span>
              ))}
            </div>
          ) : null}

          <div style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: 8 }}>
            {itens.map((item) => (
              <div
                key={item.key}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.2fr 1.4fr 1fr auto",
                  gap: 8,
                  alignItems: "start",
                  padding: 10,
                  background: "var(--gaze)",
                  borderRadius: "var(--r-sm)",
                }}
              >
                <input
                  className={s.input}
                  placeholder="Medicamento"
                  value={item.medicationName}
                  disabled={!!item.medicationId}
                  onChange={(e) => atualizarItem(item.key, "medicationName", e.target.value)}
                />
                <input
                  className={s.input}
                  placeholder="Posologia"
                  value={item.posology}
                  onChange={(e) => atualizarItem(item.key, "posology", e.target.value)}
                />
                <input
                  className={s.input}
                  placeholder="Instruções (opcional)"
                  value={item.instructions}
                  onChange={(e) => atualizarItem(item.key, "instructions", e.target.value)}
                />
                <Button type="button" variant="ghost" className="odontoflow-btn--sm" onClick={() => removerItem(item.key)}>
                  Remover
                </Button>
              </div>
            ))}
          </div>

          <div className={s.campo} style={{ minWidth: 220 }}>
            <label className={s.rotuloCampo}>Adicionar medicamento do catálogo</label>
            <div style={{ display: "flex", gap: 8 }}>
              <select className={s.input} value={medicationId} onChange={(e) => setMedicationId(e.target.value)}>
                {medicamentosDisponiveis.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
              <Button type="button" variant="secondary" className="odontoflow-btn--sm" onClick={adicionarItem}>
                + Adicionar
              </Button>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            className="odontoflow-btn--sm"
            style={{ alignSelf: "flex-start" }}
            onClick={() => setItens((atual) => [...atual, novoItem()])}
          >
            + Medicamento fora do catálogo
          </Button>

          <div className={s.campo}>
            <label className={s.rotuloCampo}>Observações (opcional)</label>
            <input className={s.input} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <Button type="submit" variant="primary" disabled={enviando}>
              {enviando ? "Emitindo…" : "Emitir receita"}
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
