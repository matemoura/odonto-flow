import { notFound } from "next/navigation";
import { ApiError, getPublicClinic, getPublicProfessionals } from "../../../../lib/api";
import BookingFlow from "./BookingFlow";
import s from "./agendar.module.css";

export default async function PublicBookingPage({
  params,
}: {
  params: Promise<{ clinicSlug: string }>;
}) {
  const { clinicSlug } = await params;

  let clinica;
  let profissionais;
  try {
    [clinica, profissionais] = await Promise.all([
      getPublicClinic(clinicSlug),
      getPublicProfessionals(clinicSlug),
    ]);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }
    return (
      <main id="conteudo" className={s.pagina}>
        <div className={s.folha} style={{ padding: 24 }} role="alert">
          Não foi possível carregar a página de agendamento agora. Tente novamente em instantes.
        </div>
      </main>
    );
  }

  return (
    <main id="conteudo" className={s.pagina}>
      <div className={s.folha}>
        <header className={s.topo}>
          <div className={s.identidade}>
            <span className={s.selo} aria-hidden="true">
              {clinica.name.charAt(0)}
            </span>
            <span>
              <strong className={s.clinica}>{clinica.name}</strong>
            </span>
          </div>
        </header>

        <section className={s.capa}>
          <h1 className={s.titulo}>Vamos marcar sua primeira consulta.</h1>
          <p className={s.subtitulo}>
            Leva dois minutos e não precisa criar conta. Na avaliação a gente examina, mostra o
            que encontrou e entrega o plano por escrito — sem compromisso.
          </p>
          <ul className={s.garantias}>
            <li>40 minutos</li>
            <li>sem custo de retorno</li>
          </ul>
        </section>

        {profissionais.length === 0 ? (
          <p className={s.subtitulo} style={{ padding: "0 22px 22px" }}>
            Esta clínica ainda não cadastrou profissionais para agendamento online. Entre em
            contato diretamente com a clínica.
          </p>
        ) : (
          <BookingFlow clinicSlug={clinicSlug} profissionais={profissionais} />
        )}

        <footer className={s.rodape}>
          Seus dados ficam só com a clínica — consentimento LGPD registrado no envio.
        </footer>
      </div>
    </main>
  );
}
