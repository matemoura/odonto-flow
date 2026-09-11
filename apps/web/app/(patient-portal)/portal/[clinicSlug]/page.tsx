import { notFound } from "next/navigation";
import { ApiError, getPortalAppointments, getPublicClinic } from "../../../../lib/api";
import { getPatientSession } from "../../../../lib/session";
import { PatientLoginForm } from "./PatientLoginForm";
import { PatientLogoutButton } from "./PatientLogoutButton";
import s from "./portal.module.css";

function formatAppointment(iso: string) {
  const data = new Date(iso);
  return {
    diaSemana: new Intl.DateTimeFormat("pt-BR", { weekday: "long" }).format(data),
    dataExtenso: new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long" }).format(data),
    hora: new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(data),
  };
}

export default async function PatientPortalPage({
  params,
}: {
  params: Promise<{ clinicSlug: string }>;
}) {
  const { clinicSlug } = await params;

  let clinica;
  try {
    clinica = await getPublicClinic(clinicSlug);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    clinica = { name: clinicSlug, slug: clinicSlug };
  }

  const session = await getPatientSession(clinicSlug);

  if (!session) {
    return (
      <main id="conteudo" className={s.pagina}>
        <div className={s.folha}>
          <header className={s.topo}>
            <span className={s.marca}>
              Odonto Flow · <span className={s.marcaClinica}>{clinica.name}</span>
            </span>
          </header>
          <PatientLoginForm clinicSlug={clinicSlug} />
        </div>
      </main>
    );
  }

  let dados;
  try {
    dados = await getPortalAppointments(clinicSlug, session.token);
  } catch {
    return (
      <main id="conteudo" className={s.pagina}>
        <div className={s.folha} style={{ padding: 24 }} role="alert">
          Não foi possível carregar seus dados agora. Tente novamente em instantes.
        </div>
      </main>
    );
  }

  const { upcoming, history } = dados;

  return (
    <main id="conteudo" className={s.pagina}>
      <div className={s.folha}>
        <header className={s.topo}>
          <span className={s.marca}>
            Odonto Flow · <span className={s.marcaClinica}>{clinica.name}</span>
          </span>
          <PatientLogoutButton />
        </header>

        {upcoming ? (
          <section className={`arco arco--alto ${s.destaque}`} aria-labelledby="proxima-titulo">
            <span className="rotulo rotulo--acento" id="proxima-titulo">
              Sua próxima consulta
            </span>
            <p className={s.destaqueHora}>
              {formatAppointment(upcoming.startAt).diaSemana}, {formatAppointment(upcoming.startAt).hora}
            </p>
            <p className={s.destaqueDetalhe}>
              {formatAppointment(upcoming.startAt).dataExtenso} · com {upcoming.professional.user.name}
            </p>
          </section>
        ) : (
          <section className={`arco arco--alto ${s.destaque}`}>
            <span className="rotulo rotulo--acento">Sua próxima consulta</span>
            <p className={s.destaqueDetalhe} style={{ marginTop: 10 }}>
              Você não tem nenhuma consulta agendada no momento.
            </p>
          </section>
        )}

        <div className={s.corpo}>
          <section aria-labelledby="historico-titulo">
            <h2 className={s.secaoTitulo} id="historico-titulo">
              Seu histórico
            </h2>
            {history.length === 0 ? (
              <p className={s.registroDetalhe}>Nenhum atendimento anterior registrado ainda.</p>
            ) : (
              <ul className={s.historico}>
                {history.map((item) => (
                  <li key={item.id} className={s.registro}>
                    <span className={s.data}>{formatAppointment(item.startAt).dataExtenso}</span>
                    <span className={s.registroCorpo}>
                      <strong className={s.registroTitulo}>Consulta</strong>
                      <span className={s.registroDetalhe}>com {item.professional.user.name}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <p className={s.ajuda}>
            Dúvida antes da consulta? Fale com a recepção da clínica.
          </p>
          <p className="sr-only">Clínica: {clinicSlug}</p>
        </div>
      </div>
    </main>
  );
}
