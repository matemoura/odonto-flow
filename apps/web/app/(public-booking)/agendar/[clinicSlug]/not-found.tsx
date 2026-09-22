import Link from "next/link";
import s from "./agendar.module.css";

export default function ClinicaNaoEncontrada() {
  return (
    <main id="conteudo" className={s.pagina}>
      <div className={s.folha} style={{ padding: 24, textAlign: "center" }}>
        <span className={s.clinica}>Odonto Flow</span>
        <p style={{ margin: "10px 0 0", fontSize: 14, fontWeight: 600 }}>
          Não encontramos essa clínica.
        </p>
        <p style={{ margin: "6px 0 20px", fontSize: 13, color: "var(--tinta-70)" }}>
          O link de agendamento que você acessou não corresponde a nenhuma clínica cadastrada.
          Verifique o link ou fale diretamente com a clínica.
        </p>
        <Link href="/" className="odontoflow-btn odontoflow-btn--secondary">
          Ir para a página inicial
        </Link>
      </div>
    </main>
  );
}
