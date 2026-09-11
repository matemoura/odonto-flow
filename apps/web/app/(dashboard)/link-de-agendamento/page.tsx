import { redirect } from "next/navigation";
import { getStaffSession } from "../../../lib/session";
import { CopyLinkButton } from "./CopyLinkButton";
import s from "../admin.module.css";

export const metadata = { title: "Link de agendamento — Odonto Flow" };

export default async function LinkDeAgendamentoPage() {
  const session = await getStaffSession();
  if (!session) redirect("/entrar");

  const path = `/agendar/${session.clinicSlug}`;

  return (
    <div className={s.pagina}>
      <h1 className={s.titulo}>Link de agendamento</h1>
      <p style={{ fontSize: 13, color: "var(--tinta-70)", maxWidth: 560 }}>
        Compartilhe este link com pacientes (WhatsApp, Instagram, site) para eles marcarem
        consulta sem precisar ligar para a clínica.
      </p>
      <CopyLinkButton path={path} />
    </div>
  );
}
