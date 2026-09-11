import Link from "next/link";
import { redirect } from "next/navigation";
import { getOpportunities, getPatients, getPendingBudgets, getStaffProfessionals } from "../../../lib/api";
import { getStaffSession } from "../../../lib/session";
import { NovaOportunidadeForm } from "./NovaOportunidadeForm";
import { StageSelect } from "./StageSelect";
import { STAGES } from "./stages";
import s from "../admin.module.css";
import c from "./crm.module.css";

export const metadata = { title: "CRM — Odonto Flow" };

function formatCents(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

export default async function CrmPage() {
  const session = await getStaffSession();
  if (!session) redirect("/entrar");

  let opportunities;
  let pendingBudgets;
  let patients;
  let professionals;
  try {
    [opportunities, pendingBudgets, patients, professionals] = await Promise.all([
      getOpportunities(session.clinicSlug, session.token),
      getPendingBudgets(session.clinicSlug, session.token),
      getPatients(session.clinicSlug, session.token),
      getStaffProfessionals(session.clinicSlug, session.token),
    ]);
  } catch {
    return (
      <div className={s.pagina}>
        <p className={s.erro} role="alert">
          Não foi possível carregar o CRM agora.
        </p>
      </div>
    );
  }

  return (
    <div className={s.pagina}>
      <h1 className={s.titulo}>CRM</h1>

      {pendingBudgets.length > 0 ? (
        <div className={c.aviso}>
          <strong style={{ fontSize: 13 }}>Orçamentos parados — funil de follow-up</strong>
          {pendingBudgets.map((b) => (
            <div key={b.id} className={c.avisoItem}>
              <span>
                <Link href={`/pacientes/${b.patient.id}`}>{b.patient.name}</Link> · {formatCents(b.totalCents)} · com{" "}
                {b.professional.user.name}
              </span>
              <span className={c.avisoDias}>{b.diasPendente === 0 ? "hoje" : `${b.diasPendente}d parado`}</span>
            </div>
          ))}
        </div>
      ) : null}

      <NovaOportunidadeForm patients={patients} professionals={professionals} />

      <div className={c.kanban}>
        {STAGES.map((stage) => {
          const cards = opportunities.filter((o) => o.stage === stage.value);
          return (
            <div key={stage.value} className={c.coluna}>
              <span className={c.colunaTitulo}>
                {stage.label} ({cards.length})
              </span>
              {cards.map((o) => (
                <div key={o.id} className={c.card}>
                  <span className={c.cardTitulo}>{o.title}</span>
                  <span className={c.cardDetalhe}>{o.patient.name}</span>
                  {o.owner ? <span className={c.cardDetalhe}>com {o.owner.user.name}</span> : null}
                  <StageSelect opportunityId={o.id} stage={o.stage} />
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
