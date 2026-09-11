import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import {
  ApiError,
  getBudgetsForPatient,
  getCertificates,
  getContract,
  getCreditScore,
  getFacialPlannings,
  getOrthodonticTreatments,
  getPatient,
  getProcedures,
  getStaffProfessionals,
  type Contract,
} from "../../../../lib/api";
import { getStaffSession } from "../../../../lib/session";
import { EditarPacienteForm } from "./EditarPacienteForm";
import { CreditScoreSection } from "./CreditScoreSection";
import { BudgetsSection } from "./BudgetsSection";
import { OrthodonticsSection } from "./OrthodonticsSection";
import { FaceogramSection } from "./FaceogramSection";
import { CertificatesSection } from "./CertificatesSection";
import s from "../../admin.module.css";

export default async function EditarPacientePage({ params }: { params: Promise<{ id: string }> }) {
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

  const [creditScore, budgets, procedures, professionals, orthodonticTreatments, facialPlannings, certificates] =
    await Promise.all([
      getCreditScore(session.clinicSlug, session.token, id).catch(() => null),
      getBudgetsForPatient(session.clinicSlug, session.token, id).catch(() => []),
      getProcedures(session.clinicSlug, session.token).catch(() => []),
      getStaffProfessionals(session.clinicSlug, session.token).catch(() => []),
      getOrthodonticTreatments(session.clinicSlug, session.token, id).catch(() => []),
      getFacialPlannings(session.clinicSlug, session.token, id).catch(() => []),
      getCertificates(session.clinicSlug, session.token, id).catch(() => []),
    ]);

  const approvedBudgetIds = budgets.filter((b) => b.status === "APPROVED").map((b) => b.id);
  const contractEntries = await Promise.all(
    approvedBudgetIds.map(
      async (budgetId) => [budgetId, await getContract(session.clinicSlug, session.token, budgetId).catch(() => null)] as const,
    ),
  );
  const contractsByBudgetId: Record<string, Contract> = Object.fromEntries(contractEntries);

  return (
    <div className={s.pagina}>
      <div className={s.cabecalho}>
        <h1 className={s.titulo}>{patient.name}</h1>
        <Link href={`/pacientes/${id}/anamnese`} className="odontoflow-btn odontoflow-btn--primary odontoflow-btn--sm">
          Ficha de anamnese completa →
        </Link>
      </div>
      <EditarPacienteForm patient={patient} />

      <div className={s.blocos}>
        <BudgetsSection
          patientId={id}
          budgets={budgets}
          procedures={procedures}
          professionals={professionals}
          contractsByBudgetId={contractsByBudgetId}
        />
        <OrthodonticsSection patientId={id} treatments={orthodonticTreatments} professionals={professionals} />
        <CertificatesSection patientId={id} certificates={certificates} professionals={professionals} />
        <FaceogramSection patientId={id} plannings={facialPlannings} />
        <CreditScoreSection patientId={id} initial={creditScore} />
      </div>
    </div>
  );
}
