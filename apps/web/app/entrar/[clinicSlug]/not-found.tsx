import Link from "next/link";
import s from "../entrar.module.css";

export default function ClinicaNaoEncontrada() {
  return (
    <main id="conteudo" className={s.pagina}>
      <div className={s.folha}>
        <h1 className={s.marca}>Odonto Flow</h1>
        <p className={s.subtitulo}>Não encontramos essa clínica.</p>
        <p className={s.rodape} style={{ margin: "0 0 20px" }}>
          O endereço que você acessou não corresponde a nenhuma clínica cadastrada. Verifique o
          link ou busque pelo nome da clínica.
        </p>
        <div className={s.acoes}>
          <Link href="/entrar" className="odontoflow-btn odontoflow-btn--primary">
            Buscar clínica
          </Link>
        </div>
      </div>
    </main>
  );
}
