import Link from "next/link";
import { redirect } from "next/navigation";
import { getTeamMembers } from "../../../lib/api";
import { getStaffSession } from "../../../lib/session";
import { EquipeTable } from "./EquipeTable";
import s from "../admin.module.css";

export const metadata = { title: "Equipe — Odonto Flow" };

export default async function EquipePage() {
  const session = await getStaffSession();
  if (!session) redirect("/entrar");
  if (session.role !== "CLINIC_ADMIN" && session.role !== "ORG_ADMIN") redirect("/agenda");

  let members;
  try {
    members = await getTeamMembers(session.clinicSlug, session.token);
  } catch {
    return (
      <div className={s.pagina}>
        <p className={s.erro} role="alert">
          Não foi possível carregar a equipe agora.
        </p>
      </div>
    );
  }

  return (
    <div className={s.pagina}>
      <div className={s.cabecalho}>
        <h1 className={s.titulo}>Equipe</h1>
        <Link href="/equipe/novo" className="odontoflow-btn odontoflow-btn--primary">
          + Novo membro
        </Link>
      </div>

      {members.length === 0 ? (
        <p className={s.vazio}>Nenhum membro na equipe ainda.</p>
      ) : (
        <EquipeTable members={members} />
      )}
    </div>
  );
}
