import { redirect, notFound } from "next/navigation";
import { ApiError, getCommissionRules, getStaffProfessional } from "../../../../lib/api";
import { getStaffSession } from "../../../../lib/session";
import { EditarProfissionalForm } from "./EditarProfissionalForm";
import s from "../../admin.module.css";

export default async function EditarProfissionalPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getStaffSession();
  if (!session) redirect("/entrar");

  const { id } = await params;

  let professional;
  try {
    professional = await getStaffProfessional(session.clinicSlug, session.token, id);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    return (
      <div className={s.pagina}>
        <p className={s.erro} role="alert">
          Não foi possível carregar este profissional agora.
        </p>
      </div>
    );
  }

  let commissionPercent = 0;
  try {
    const rules = await getCommissionRules(session.clinicSlug, session.token);
    const rule = rules.find((r) => r.professionalId === id);
    commissionPercent = rule ? rule.percentageBasisPoints / 100 : 0;
  } catch {
    // sem permissão (não é CLINIC_ADMIN) ou API fora do ar — o form assume 0%
  }

  return (
    <div className={s.pagina}>
      <h1 className={s.titulo}>{professional.user.name}</h1>
      <EditarProfissionalForm professional={professional} commissionPercent={commissionPercent} />
    </div>
  );
}
