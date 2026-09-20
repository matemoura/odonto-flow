import Link from "next/link";
import { AgendaPreview } from "./AgendaPreview";
import s from "./home.module.css";

export default function HomePage() {
  return (
    <main id="conteudo" className={s.pagina}>
      <div className={s.topo}>
        <span className={s.marca}>Odonto Flow</span>
        <span className={s.selo}>Ambiente de demonstração</span>
      </div>

      <section className={s.hero}>
        <div className={s.heroTexto}>
          <span className="rotulo rotulo--acento">Gestão de clínica odontológica</span>
          <h1 className={s.titulo}>A agenda da sua clínica, em paz.</h1>
          <p className={s.subtitulo}>
            Odonto Flow organiza a agenda, o prontuário e o financeiro da sua clínica — sem planilha e sem
            grupo de WhatsApp lotado de recado perdido.
          </p>
        </div>

        <AgendaPreview />
      </section>

      <section className={s.acessoPrincipal}>
        <div>
          <span className={s.caminhoRotulo}>Ainda não é cliente</span>
          <h2 className={s.acessoTitulo}>Coloque sua clínica na Odonto Flow</h2>
          <p className={s.caminhoTexto}>
            Veja os planos e crie sua conta em poucos minutos, ou fale com a gente antes se preferir.
          </p>
        </div>
        <Link href="/planos" className="odontoflow-btn odontoflow-btn--primary">
          Ver planos
        </Link>
      </section>

      <section className={s.acessoPrincipal}>
        <div>
          <span className={s.caminhoRotulo}>Já usa a Odonto Flow</span>
          <h2 className={s.acessoTitulo}>Entre na sua clínica</h2>
          <p className={s.caminhoTexto}>
            Agenda do dia, prontuário, orçamentos e financeiro da sua clínica — tudo num só lugar.
          </p>
        </div>
        <Link href="/entrar" className="odontoflow-btn odontoflow-btn--secondary">
          Entrar
        </Link>
      </section>

      <section className={s.demo}>
        <h2 className={s.demoTitulo}>Quer ver como fica na prática?</h2>
        <p className={s.demoTexto}>
          Sem precisar de conta: experimente os dois lados da Odonto Flow com a nossa clínica de
          demonstração, a <strong>Vila Nova</strong>.
        </p>
        <div className={s.demoLinks}>
          <Link href="/agendar/vila-nova" className="odontoflow-btn odontoflow-btn--secondary">
            Testar o agendamento, como paciente
          </Link>
          <Link href="/portal/vila-nova" className="odontoflow-btn odontoflow-btn--ghost">
            Ver o portal do paciente
          </Link>
        </div>
      </section>

      {/* Esta página é pública. Nenhuma credencial aqui: a senha do seed é a
          mesma do administrador da clínica e a do dono da plataforma, então
          imprimi-la no rodapé entregava o painel inteiro a quem abrisse o
          site. Quem precisa das contas de demonstração encontra no README. */}
      <p className={s.rodape}>
        Ambiente de demonstração — os dados são fictícios.
        <br />
        <Link href="/termos">Termos de Uso</Link> · <Link href="/privacidade">Política de Privacidade</Link>
      </p>
    </main>
  );
}
