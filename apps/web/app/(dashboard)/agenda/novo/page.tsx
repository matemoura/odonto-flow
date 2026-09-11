import { redirect } from "next/navigation";
import { getPatients, getStaffProfessionals } from "../../../../lib/api";
import { getStaffSession } from "../../../../lib/session";
import { NovoAgendamentoForm } from "./NovoAgendamentoForm";
import s from "../../admin.module.css";

export const metadata = { title: "Novo agendamento — Odonto Flow" };

export default async function NovoAgendamentoPage() {
  const session = await getStaffSession();
  if (!session) redirect("/entrar");

  let patients;
  let professionals;
  try {
    [patients, professionals] = await Promise.all([
      getPatients(session.clinicSlug, session.token),
      getStaffProfessionals(session.clinicSlug, session.token),
    ]);
  } catch {
    return (
      <div className={s.pagina}>
        <p className={s.erro} role="alert">
          Não foi possível carregar pacientes e profissionais agora.
        </p>
      </div>
    );
  }

  return (
    <div className={s.pagina}>
      <h1 className={s.titulo}>Novo agendamento</h1>
      <NovoAgendamentoForm patients={patients} professionals={professionals} />
    </div>
  );
}
