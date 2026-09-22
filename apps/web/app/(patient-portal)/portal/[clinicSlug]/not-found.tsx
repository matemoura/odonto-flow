import Link from "next/link";
import s from "./portal.module.css";

export default function ClinicaNaoEncontrada() {
  return (
    <main id="conteudo" className={s.pagina}>
      <div className={s.folha} style={{ padding: 24, textAlign: "center" }}>
        <span className={s.marca}>Odonto Flow</span>
        <p style={{ margin: "10px 0 0", fontSize: 14, fontWeight: 600 }}>
          Não encontramos essa clínica.
        </p>
        <p style={{ margin: "6px 0 20px", fontSize: 13, color: "var(--tinta-70)" }}>
          O link do portal que você acessou não corresponde a nenhuma clínica cadastrada.
          Verifique o link enviado pela clínica ou fale com a recepção.
        </p>
        <Link href="/" className="odontoflow-btn odontoflow-btn--secondary">
          Ir para a página inicial
        </Link>
      </div>
    </main>
  );
}
