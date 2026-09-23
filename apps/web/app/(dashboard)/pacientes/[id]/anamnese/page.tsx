import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ApiError,
  getAnamnesis,
  getOdontogram,
  getPatient,
  getPeriodontogram,
  getProcedures,
  getStaffProfessionals,
  getTreatmentPlanOptions,
} from "../../../../../lib/api";
import { getStaffSession } from "../../../../../lib/session";
import { DadosCompletosForm } from "./DadosCompletosForm";
import { AnamneseForm } from "./AnamneseForm";
import { OdontogramaSection } from "./OdontogramaSection";
import { PeriogramaSection } from "./PeriogramaSection";
import { PlanoTratamentoSection } from "./PlanoTratamentoSection";
import s from "../../../admin.module.css";

export const metadata = { title: "Ficha de anamnese — Odonto Flow" };

export default async function AnamnesePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getStaffSession();
  if (!session) redirect("/entrar");

  const { id } = await params;

  let patient;
  try {
    patient = await getPatient(session.clinicSlug, session.token, id);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    return (
      <div className={s.pagina}>
        <p className={s.erro} role="alert">
          Não foi possível carregar este paciente agora.
        </p>
      </div>
    );
  }

  const [anamnesis, odontogram, periodontogram, treatmentPlanOptions, professionals, procedures] = await Promise.all([
    getAnamnesis(session.clinicSlug, session.token, id).catch(() => null),
    getOdontogram(session.clinicSlug, session.token, id).catch(() => []),
    getPeriodontogram(session.clinicSlug, session.token, id).catch(() => []),
    getTreatmentPlanOptions(session.clinicSlug, session.token, id).catch(() => []),
    getStaffProfessionals(session.clinicSlug, session.token).catch(() => []),
    getProcedures(session.clinicSlug, session.token).catch(() => []),
  ]);

  return (
    <div className={s.pagina}>
      <div className={s.cabecalho}>
        <h1 className={s.titulo}>Ficha de anamnese — {patient.name}</h1>
        <Link href={`/pacientes/${id}`} className="odontoflow-btn odontoflow-btn--ghost odontoflow-btn--sm">
          ← Voltar ao paciente
        </Link>
      </div>

      <section>
        <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>Dados completos do paciente</h2>
        <DadosCompletosForm patient={patient} />
      </section>

      <hr style={{ border: 0, borderTop: "1px solid var(--linha)", margin: "8px 0" }} />
      <section>
        <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>
          Anamnese — motivo, saúde, higiene e consentimento
        </h2>
        <AnamneseForm patientId={id} initial={anamnesis} />
      </section>

      <hr style={{ border: 0, borderTop: "1px solid var(--linha)", margin: "8px 0" }} />
      <section>
        <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>Odontograma</h2>
        <OdontogramaSection patientId={id} entries={odontogram} />
      </section>

      <hr style={{ border: 0, borderTop: "1px solid var(--linha)", margin: "8px 0" }} />
      <section>
        <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>Periograma</h2>
        <PeriogramaSection patientId={id} entries={periodontogram} />
      </section>

      <hr style={{ border: 0, borderTop: "1px solid var(--linha)", margin: "8px 0" }} />
      <section>
        <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>Plano de tratamento</h2>
        <PlanoTratamentoSection
          patientId={id}
          options={treatmentPlanOptions}
          professionals={professionals}
          procedures={procedures}
        />
      </section>
    </div>
  );
}
