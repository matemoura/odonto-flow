import { redirect } from "next/navigation";
import { getPlatformIntegrations } from "../../../../lib/api";
import { INTEGRACOES } from "../../../../lib/integracoes";
import { getPlatformSession } from "../../../../lib/session";
import { ClinicIntegrationsCard } from "./ClinicIntegrationsCard";
import s from "../painel.module.css";

export const metadata = { title: "Integrações — Painel da plataforma" };

export default async function IntegracoesPlataformaPage() {
  const session = await getPlatformSession();
  if (!session) redirect("/plataforma/entrar");

  let clinicas;
  try {
    clinicas = await getPlatformIntegrations(session.token);
  } catch {
    return (
      <div>
        <p className={s.erro} role="alert">
          Não foi possível carregar as integrações agora.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className={s.cabecalho}>
        <div>
          <h1 className={s.titulo}>Integrações</h1>
          <p className={s.subtitulo}>
            Quais clínicas têm quais integrações. O que você liberar aqui aparece na tela de Integrações do
            dono da clínica — o resto ele nem vê.
          </p>
        </div>
      </div>

      {clinicas.length === 0 ? (
        <p className={s.vazio}>Nenhuma clínica cadastrada ainda.</p>
      ) : (
        <div className={s.secoes}>
          {clinicas.map((clinica) => (
            <ClinicIntegrationsCard key={clinica.id} clinica={clinica} />
          ))}
        </div>
      )}

      {/* Sugestões de provedor, uma lista por integração para o documento
          inteiro. Se cada cartão trouxesse a sua, o mesmo id apareceria uma vez
          por clínica e o navegador usaria sempre a primeira. */}
      {INTEGRACOES.map((info) => (
        <datalist key={info.kind} id={`provedores-${info.kind}`}>
          <option value="mock" />
          {info.provedoresReais.split(", ").map((provedor) => (
            <option key={provedor} value={provedor} />
          ))}
        </datalist>
      ))}
    </div>
  );
}
