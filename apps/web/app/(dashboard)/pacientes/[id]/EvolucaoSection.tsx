"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@odontoflow/ui";
import {
  CLINICAL_RECORD_TYPE_LABEL,
  type ClinicalRecord,
  type ClinicalRecordType,
} from "../../../../lib/api";
import { formatarDataHora } from "../../../../lib/datas";
import { useFusoDaClinica } from "../../FusoDaClinica";
import s from "../../admin.module.css";

/**
 * Evolução clínica — o que foi feito em cada atendimento.
 *
 * O backend tinha `GET`/`POST /clinical-records` desde a Fase 1 e nenhuma tela
 * consumia: o dentista terminava o atendimento e não tinha onde escrever. O
 * modelo `ClinicalRecord` ficava órfão de escrita, e um sistema odontológico
 * sem prontuário evolutivo não serve para o trabalho.
 *
 * É append-only de propósito: registro clínico não se edita nem se apaga
 * (guarda mínima exigida por norma do CFO). Errou, escreve outro registro
 * corrigindo — é o que o papel sempre fez.
 */
export function EvolucaoSection({
  patientId,
  records,
}: {
  patientId: string;
  /** `null` = a leitura falhou. Não é o mesmo que não haver registro. */
  records: ClinicalRecord[] | null;
}) {
  const router = useRouter();
  const fuso = useFusoDaClinica();
  const [aberto, setAberto] = useState(false);
  const [tipo, setTipo] = useState<ClinicalRecordType>("EVOLUTION");
  const [conteudo, setConteudo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErro(null);
    if (!conteudo.trim()) {
      setErro("Escreva o que foi feito neste atendimento.");
      return;
    }
    setSalvando(true);
    try {
      const res = await fetch("/api/staff/clinical-records/evolucao", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ patientId, type: tipo, content: conteudo.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          Array.isArray(data.message) ? data.message[0] : (data.message ?? "Não foi possível registrar."),
        );
      }
      setConteudo("");
      setAberto(false);
      router.refresh();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível registrar.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className={s.bloco}>
      <div className={s.tituloComSelo}>
        <h2 className={s.blocoTitulo}>Evolução clínica</h2>
        {records && records.length > 0 ? (
          <span className="chip chip--estatico">{records.length}</span>
        ) : null}
      </div>

      {aberto ? (
        <form onSubmit={handleSubmit} className={s.campo}>
          {erro ? (
            <p className={s.erro} role="alert">
              {erro}
            </p>
          ) : null}

          <label className={s.rotuloCampo} htmlFor="evolucao-tipo">
            Tipo
          </label>
          <select
            id="evolucao-tipo"
            className={s.input}
            value={tipo}
            onChange={(e) => setTipo(e.target.value as ClinicalRecordType)}
          >
            <option value="EVOLUTION">{CLINICAL_RECORD_TYPE_LABEL.EVOLUTION}</option>
            <option value="EXAM">{CLINICAL_RECORD_TYPE_LABEL.EXAM}</option>
          </select>

          <label className={s.rotuloCampo} htmlFor="evolucao-conteudo">
            O que foi feito
          </label>
          <textarea
            id="evolucao-conteudo"
            className={s.input}
            style={{ minHeight: 110, padding: "10px 14px", lineHeight: 1.5 }}
            value={conteudo}
            onChange={(e) => {
              setErro(null);
              setConteudo(e.target.value);
            }}
            placeholder="Ex.: Restauração em resina no 26, face oclusal. Anestesia com lidocaína 2%. Paciente sem intercorrências."
          />
          <span className={s.dica}>
            Depois de salvo, o registro não pode ser editado nem apagado — é assim que o prontuário
            precisa funcionar. Para corrigir, escreva um novo registro.
          </span>

          <div className={s.acoes}>
            <Button type="submit" variant="primary" className="odontoflow-btn--sm" disabled={salvando}>
              {salvando ? "Salvando…" : "Registrar"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="odontoflow-btn--sm"
              onClick={() => {
                setAberto(false);
                setErro(null);
              }}
              disabled={salvando}
            >
              Cancelar
            </Button>
          </div>
        </form>
      ) : (
        <Button variant="secondary" className="odontoflow-btn--sm" onClick={() => setAberto(true)}>
          + Registrar evolução
        </Button>
      )}

      {records === null ? (
        <p className={s.erro} role="alert">
          Não foi possível carregar o histórico clínico agora. Recarregue a página — não registre
          nada antes de ver o que já existe.
        </p>
      ) : records.length === 0 ? (
        <p className={s.dica}>
          Nenhum registro ainda. Depois de cada atendimento, anote aqui o que foi feito — é o
          histórico clínico do paciente.
        </p>
      ) : (
        <ul className={s.linhaDoTempo}>
          {records.map((record) => (
            <li key={record.id} className={s.registro}>
              <div className={s.registroTopo}>
                <span className="chip chip--estatico">{CLINICAL_RECORD_TYPE_LABEL[record.type]}</span>
                <span className={s.dica}>
                  {formatarDataHora(record.createdAt, fuso)} · {record.professional.user.name}
                </span>
              </div>
              {/* `pre-wrap`: o texto é digitado com quebras de linha, e o
                  dentista espera lê-las de volta como escreveu. */}
              <p className={s.registroTexto}>{record.content}</p>

              {record.professionalSignature || record.patientSignature ? (
                <div className={s.assinaturasRegistro}>
                  {record.professionalSignature ? (
                    <span className={s.assinaturaSelo}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={record.professionalSignature} alt="Assinatura do profissional" />
                      <span className={s.dica}>
                        Profissional ·{" "}
                        {record.professionalSignedAt ? formatarDataHora(record.professionalSignedAt, fuso) : ""}
                      </span>
                    </span>
                  ) : null}
                  {record.patientSignature ? (
                    <span className={s.assinaturaSelo}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={record.patientSignature} alt="Assinatura do paciente" />
                      <span className={s.dica}>
                        Paciente ·{" "}
                        {record.patientSignedAt ? formatarDataHora(record.patientSignedAt, fuso) : ""}
                      </span>
                    </span>
                  ) : null}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
