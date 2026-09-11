import Link from "next/link";
import { redirect } from "next/navigation";
import { getCardSettings } from "../../../../lib/api";
import { getStaffSession } from "../../../../lib/session";
import { CardSettingsForm } from "./CardSettingsForm";
import s from "../../admin.module.css";

export const metadata = { title: "Taxa e prazo do cartão — Odonto Flow" };

export default async function CartaoPage() {
  const session = await getStaffSession();
  if (!session) redirect("/entrar");

  let settings;
  try {
    settings = await getCardSettings(session.clinicSlug, session.token);
  } catch {
    return (
      <div className={s.pagina}>
        <p className={s.erro} role="alert">
          Não foi possível carregar as configurações agora.
        </p>
      </div>
    );
  }

  return (
    <div className={s.pagina}>
      <div className={s.cabecalho}>
        <h1 className={s.titulo}>Taxa e prazo do cartão</h1>
        <Link href="/financeiro" className="odontoflow-btn odontoflow-btn--ghost odontoflow-btn--sm">
          Voltar ao financeiro
        </Link>
      </div>
      <CardSettingsForm settings={settings} />
    </div>
  );
}
