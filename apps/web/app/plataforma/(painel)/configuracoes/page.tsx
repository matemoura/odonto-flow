import { redirect } from "next/navigation";
import { getPlatformSettings, getPlatformIntegrationCredentials } from "../../../../lib/api";
import { getPlatformSession } from "../../../../lib/session";
import { SettingsForm } from "./SettingsForm";
import { ConectarServicosForm } from "./ConectarServicosForm";
import s from "../painel.module.css";

export const metadata = { title: "Configurações — Painel da plataforma" };

export default async function ConfiguracoesPlataformaPage() {
  const session = await getPlatformSession();
  if (!session) redirect("/plataforma/entrar");

  let settings;
  let credenciais;
  try {
    [settings, credenciais] = await Promise.all([
      getPlatformSettings(session.token),
      getPlatformIntegrationCredentials(session.token),
    ]);
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

      <div className={s.cabecalho} style={{ marginTop: "var(--s7)" }}>
        <div>
          <h2 className={s.titulo} style={{ fontSize: 20 }}>
            Conectar serviços
          </h2>
          <p className={s.subtitulo}>
            A conta real de cada provedor — quem contrata e paga é a plataforma. Uma vez conectado aqui, libere
            a integração para cada clínica em <code>Integrações</code>.
          </p>
        </div>
      </div>
      <ConectarServicosForm credenciais={credenciais} />
    </div>
  );
}
