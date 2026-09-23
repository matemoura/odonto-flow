import Link from "next/link";
import { redirect } from "next/navigation";
import { getAppointmentLabels } from "../../../../lib/api";
import { getStaffSession } from "../../../../lib/session";
import { RotulosManager } from "./RotulosManager";
import s from "../../admin.module.css";

export const metadata = { title: "Rótulos da agenda — Odonto Flow" };

export default async function RotulosPage() {
  const session = await getStaffSession();
  if (!session) redirect("/entrar");
  if (session.role !== "CLINIC_ADMIN" && session.role !== "ORG_ADMIN") redirect("/agenda");

  let labels;
  try {
    labels = await getAppointmentLabels(session.clinicSlug, session.token);
  } catch {
    return (
      <div className={s.pagina}>
        <p className={s.erro} role="alert">
          Não foi possível carregar os rótulos agora.
        </p>
      </div>
    );
  }

  return (
    <div className={s.pagina}>
      <div className={s.cabecalho}>
        <div>
          <h1 className={s.titulo}>Rótulos da agenda</h1>
          <p className={s.dica}>
            Crie rótulos coloridos (ex.: &quot;Retorno&quot;, &quot;Urgência&quot;) pra marcar consultas na agenda de relance.
          </p>
        </div>
        <Link href="/agenda" className="odontoflow-btn odontoflow-btn--ghost odontoflow-btn--sm">
          ← Voltar à agenda
        </Link>
      </div>

      <RotulosManager labels={labels} />
    </div>
  );
}
