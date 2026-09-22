import { redirect } from "next/navigation";
import { getIntegrationsConfig } from "../../../lib/api";
import { integracao } from "../../../lib/integracoes";
import { getStaffSession } from "../../../lib/session";
import { WhatsAppDaClinicaForm } from "./WhatsAppDaClinicaForm";
import { NfeDaClinicaForm } from "./NfeDaClinicaForm";
import s from "../admin.module.css";

export const metadata = { title: "Integrações — Odonto Flow" };

export default async function IntegracoesPage() {
  const session = await getStaffSession();
  if (!session) redirect("/entrar");

  let view;
  try {
    view = await getIntegrationsConfig(session.clinicSlug, session.token);
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

      {view.integrations.length === 0 ? (
        <p className={s.vazio}>
          Nenhuma integração liberada para esta clínica ainda. Quem libera é a equipe do Odonto Flow — fale
          com a gente para ativar WhatsApp, nota fiscal ou assinatura eletrônica.
        </p>
      ) : (
        <>
          <p className={s.dica}>
            Estas são as integrações ativas na sua clínica. Quem contrata e configura o serviço é a equipe do
            Odonto Flow; aqui você preenche só o que é seu. As marcadas como <strong>demonstração</strong>
            {" "}ainda simulam o resultado: o sistema registra o que faria, mas nada sai da clínica de verdade.
          </p>

          <div className={s.blocos}>
            {view.integrations.map(({ kind, providerName }) => {
              const info = integracao(kind);
              if (!info) return null;
              return (
                <div key={kind} className={s.bloco}>
                  <div className={s.tituloComSelo}>
                    <h2 className={s.blocoTitulo}>{info.nome}</h2>
                    {/* Nenhum provedor real está implementado ainda: o gateway
                        recusa qualquer valor diferente de "mock". Chamar isso
                        de "ativa" seria prometer um envio que não acontece. */}
                    {providerName === "mock" ? (
                      <span className="chip chip--estatico chip--alerta">demonstração</span>
                    ) : (
                      <span className="chip chip--estatico chip--alerta">em configuração</span>
                    )}
                  </div>
                  <p className={s.dica}>{info.oQueFaz}</p>
                  {kind === "WHATSAPP" ? <WhatsAppDaClinicaForm whatsappPhone={view.whatsappPhone} /> : null}
                  {kind === "NFE" ? <NfeDaClinicaForm nfeCnpjEmissor={view.nfeCnpjEmissor} /> : null}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
