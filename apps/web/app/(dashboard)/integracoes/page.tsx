import { redirect } from "next/navigation";
import { getIntegrationsConfig } from "../../../lib/api";
import { getStaffSession } from "../../../lib/session";
import { IntegrationRow } from "./IntegrationRow";
import s from "../admin.module.css";

export const metadata = { title: "Integrações — Odonto Flow" };

export default async function IntegracoesPage() {
  const session = await getStaffSession();
  if (!session) redirect("/entrar");

  let configs;
  try {
    configs = await getIntegrationsConfig(session.clinicSlug, session.token);
  } catch {
    return (
      <div className={s.pagina}>
        <p className={s.erro} role="alert">
          Só administradores da clínica podem ver esta página, ou a API está fora do ar.
        </p>
      </div>
    );
  }

  return (
    <div className={s.pagina}>
      <h1 className={s.titulo}>Integrações</h1>
      <p style={{ fontSize: 13, color: "var(--tinta-70)", maxWidth: 600 }}>
        Cada integração roda em modo <strong>mock</strong> por padrão — grátis, sem contratar nada. Trocar o
        provedor aqui só funciona quando alguém plugar a implementação real no código (ver
        packages/integrations/*); até lá, um provedor diferente de &quot;mock&quot; vai dar erro ao usar.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 520 }}>
        {configs.map((c) => (
          <IntegrationRow key={c.kind} kind={c.kind} providerName={c.providerName} enabled={c.enabled} />
        ))}
      </div>
    </div>
  );
}
