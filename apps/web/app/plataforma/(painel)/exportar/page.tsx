import { redirect } from "next/navigation";
import { getPlatformSession } from "../../../../lib/session";
import s from "../painel.module.css";

export const metadata = { title: "Exportar — Painel da plataforma" };

export default async function ExportarPlataformaPage() {
  const session = await getPlatformSession();
  if (!session) redirect("/plataforma/entrar");

  return (
    <div>
      <div className={s.cabecalho}>
        <div>
          <h1 className={s.titulo}>Exportar dados</h1>
          <p className={s.subtitulo}>
            Tire os arquivos de dentro do banco antes de migrar para outro lugar (R2, S3, outra aplicação).
          </p>
        </div>
      </div>

      <p className={s.dica} style={{ maxWidth: 640 }}>
        Hoje todo documento (foto, radiografia, contrato) fica salvo dentro do próprio Postgres, não em
        disco — é o que sobrevive a um redeploy sem precisar de object storage configurado. Este botão baixa
        um <code>.zip</code> com o arquivo de cada documento de cada clínica, organizado em
        pastas (<code>clínica/paciente/documento</code>) e acompanhado de um <code>manifesto.csv</code> com
        os metadados de cada um — pronto pra virar a estrutura de chaves de um bucket no R2/S3 depois.
      </p>
      <p className={s.dica} style={{ maxWidth: 640 }}>
        Os demais dados (pacientes, orçamentos, agenda etc.) não têm arquivo nenhum — já são texto e número
        no próprio Postgres, exportáveis a qualquer momento com um <code>pg_dump</code> comum, sem precisar
        de nada deste painel.
      </p>

      <a
        href="/api/platform/export/documents"
        className="odontoflow-btn odontoflow-btn--primary"
        style={{ marginTop: 8, display: "inline-flex" }}
      >
        Baixar todos os documentos (.zip)
      </a>
    </div>
  );
}
