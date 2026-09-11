import Link from "next/link";
import { IconeEmail, IconeWhatsApp } from "../../components/Icones";
import s from "./planos.module.css";

export const metadata = { title: "Planos — Odonto Flow" };

const PLANOS = [
  {
    id: "basic",
    nome: "Basic",
    preco: "197",
    destaque: false,
    recursos: [
      "Agenda com link público de agendamento",
      "Ficha de anamnese completa (odontograma, periograma, plano de tratamento)",
      "Atestados de comparecimento e médico",
      "Portal do paciente",
    ],
  },
  {
    id: "plus",
    nome: "Plus",
    preco: "297",
    destaque: true,
    recursos: [
      "Tudo do Basic",
      "Financeiro (fluxo de caixa + exportação)",
      "Comissionamento automático",
      "Catálogo de serviços e estoque (custo, margem e baixa automática de material)",
      "Ortodontia (cronograma de etapas)",
    ],
  },
  {
    id: "pro",
    nome: "Pro",
    preco: "447",
    destaque: false,
    recursos: [
      "Tudo do Plus",
      "CRM + funil de indicações",
      "Faceograma (planejamento estético)",
      "Contrato com assinatura eletrônica",
      "Consulta de crédito",
      "Múltiplas unidades (rede/franquia)",
    ],
  },
] as const;

export default function PlanosPage() {
  return (
    <main id="conteudo" className={s.pagina}>
      <div className={s.topo}>
        <Link href="/" className={s.marca}>
          Odonto Flow
        </Link>
      </div>

      <div className={s.cabecalho}>
        <h1 className={s.titulo}>Um plano pra cada tamanho de clínica.</h1>
        <p className={s.subtitulo}>
          Comece sozinho em poucos minutos, ou fale com a gente primeiro se quiser ver o produto
          por dentro antes de decidir.
        </p>
      </div>

      <div className={s.grade}>
        {PLANOS.map((plano) => (
          <article key={plano.id} className={plano.destaque ? `${s.plano} ${s.planoDestaque}` : s.plano}>
            {plano.destaque ? <span className={s.planoSelo}>Mais escolhido</span> : null}
            <h2 className={s.planoNome}>{plano.nome}</h2>
            <p className={s.planoPreco}>
              <strong>R$ {plano.preco}</strong>/mês por unidade
            </p>
            <ul className={s.planoLista}>
              {plano.recursos.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
            <Link
              href={`/comecar?plano=${plano.id}`}
              className={`odontoflow-btn ${plano.destaque ? "odontoflow-btn--primary" : "odontoflow-btn--secondary"}`}
            >
              Criar minha conta
            </Link>
          </article>
        ))}
      </div>
      <p className={s.avisoPreco}>Preços de lançamento, sujeitos a ajuste — sem fidelidade, cancele quando quiser.</p>

      <section className={s.complementos}>
        <h2 className={s.complementosTitulo}>Complementos (opcionais, cobrados à parte)</h2>
        <p className={s.complementosTexto}>
          WhatsApp e emissão de NF-e dependem de provedores externos pagos — o custo é por unidade e
          entra separado da mensalidade do plano. Os dados fiscais (CNPJ, inscrição municipal,
          certificado digital etc.) são preenchidos pela própria clínica dentro do sistema.
        </p>
        <div className={s.complementosGrade}>
          <article className={s.complemento}>
            <h3 className={s.complementoNome}>WhatsApp (confirmação automática)</h3>
            <p className={s.complementoPreco}>
              <strong>a partir de R$ 249</strong>/mês por unidade
            </p>
            <p className={s.complementoTexto}>
              Um número de WhatsApp dedicado pra cada clínica. Preço final depende do provedor
              contratado — fale com a gente antes de contratar.
            </p>
          </article>
          <article className={s.complemento}>
            <h3 className={s.complementoNome}>Emissão de NF-e (NFS-e)</h3>
            <p className={s.complementoPreco}>
              <strong>a partir de R$ 49</strong>/mês por unidade
            </p>
            <p className={s.complementoTexto}>
              A clínica precisa ter CNPJ e certificado digital próprios. Preço final depende do
              volume de notas emitidas — fale com a gente antes de contratar.
            </p>
          </article>
        </div>
      </section>

      <section className={s.contato}>
        <h2 className={s.contatoTitulo}>Prefere conversar antes?</h2>
        <p className={s.contatoTexto}>
          Pra rede com várias unidades, uma migração de outro sistema, ou só pra tirar dúvida antes
          de decidir — fala com a gente.
        </p>
        <div className={s.contatoLinks}>
          <a href="mailto:contato@exemplo.com.br" className="odontoflow-btn odontoflow-btn--secondary">
            <IconeEmail />
            contato@exemplo.com.br
          </a>
          <a
            href="https://wa.me/5500000000000"
            target="_blank"
            rel="noopener noreferrer"
            className="odontoflow-btn odontoflow-btn--secondary"
          >
            <IconeWhatsApp />
            WhatsApp
          </a>
        </div>
      </section>

      <p className={s.rodape}>
        Ao criar uma conta, você concorda com os <Link href="/termos">Termos de Uso</Link> e a{" "}
        <Link href="/privacidade">Política de Privacidade</Link>.
      </p>
    </main>
  );
}
