import { redirect } from "next/navigation";
import { getPlatformSettings } from "../../../../lib/api";
import { getPlatformSession } from "../../../../lib/session";
import { SettingsForm } from "./SettingsForm";
import s from "../painel.module.css";

export const metadata = { title: "Configurações — Painel da plataforma" };

export default async function ConfiguracoesPlataformaPage() {
  const session = await getPlatformSession();
  if (!session) redirect("/plataforma/entrar");

  let settings;
  try {
    settings = await getPlatformSettings(session.token);
  } catch {
    return (
      <div>
        <p className={s.erro} role="alert">
          Não foi possível carregar as configurações agora.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className={s.cabecalho}>
        <div>
          <h1 className={s.titulo}>Configurações</h1>
          <p className={s.subtitulo}>Regras de cobrança aplicadas a todas as clínicas.</p>
        </div>
      </div>
      <SettingsForm settings={settings} />
    </div>
  );
}
