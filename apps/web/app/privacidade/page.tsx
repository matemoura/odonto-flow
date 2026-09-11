import Link from "next/link";
import s from "../legal.module.css";

export const metadata = { title: "Política de Privacidade — Odonto Flow" };

export default function PrivacidadePage() {
  return (
    <main id="conteudo" className={s.pagina}>
      <Link href="/" className={s.voltar}>
        ← Voltar
      </Link>
      <h1 className={s.titulo}>Política de Privacidade</h1>
      <p className={s.atualizado}>Rascunho — última revisão de conteúdo: setembro de 2026.</p>

      <p className={s.aviso}>
        Este é um rascunho inicial, escrito com a LGPD (Lei 13.709/2018) em mente. Antes de tratar
        isso como política definitiva — especialmente por lidar com dado de saúde, categoria
        sensível pela lei — recomendamos revisão por um advogado especializado em proteção de dados.
      </p>

      <div className={s.corpo}>
        <h2>1. Quem trata o quê</h2>
        <p>
          A sua clínica é a <strong>controladora</strong> dos dados dos seus pacientes — decide o que
          coletar e por quê. O Odonto Flow atua como <strong>operador</strong>: trata esses dados só para
          prestar o serviço contratado pela clínica, seguindo as instruções dela.
        </p>

        <h2>2. Que dados coletamos</h2>
        <ul>
          <li>Da clínica: nome, e-mail e senha de quem cria e usa a conta.</li>
          <li>
            Dos pacientes (inseridos pela própria clínica): nome, contato, CPF quando informado,
            prontuário, odontograma, orçamentos, documentos/imagens e histórico de atendimento —
            incluindo dado de saúde, categoria sensível pela LGPD (art. 5º, II).
          </li>
        </ul>

        <h2>3. Base legal</h2>
        <p>
          O tratamento de dado de saúde pela clínica se apoia principalmente na execução do
          atendimento e no consentimento do paciente, registrado no momento do agendamento ou
          cadastro. Cabe à clínica garantir que tem base legal adequada para cada dado que insere no
          sistema.
        </p>

        <h2>4. Como usamos os dados</h2>
        <p>
          Só para operar o Odonto Flow: mostrar a agenda, gerar orçamentos, calcular comissionamento,
          registrar prontuário, e as demais funções descritas no produto. Não vendemos dado de
          clínica ou paciente a terceiros.
        </p>

        <h2>5. Compartilhamento com terceiros</h2>
        <p>
          Usamos provedores de infraestrutura (hospedagem, banco de dados) para operar o serviço —
          esses provedores só têm acesso ao necessário para prestar esse serviço técnico. Integrações
          pagas opcionais (WhatsApp, assinatura eletrônica, emissão de nota, consulta de crédito) só
          trocam dado com terceiros quando a própria clínica ativa e configura o provedor real —
          desligadas (modo mock) por padrão.
        </p>

        <h2>6. Retenção e exclusão</h2>
        <p>
          Prontuário e histórico clínico têm guarda mínima exigida por normas do conselho de
          odontologia — não são apagados por padrão, mesmo a pedido, mas podem ser anonimizados nos
          campos não essenciais. Dados cadastrais (contato, por exemplo) podem ser removidos a
          pedido, dentro do que a lei permitir.
        </p>

        <h2>7. Direitos do titular</h2>
        <p>
          Paciente ou clínica podem pedir acesso, correção, portabilidade ou informações sobre o
          tratamento dos seus dados. Pedidos sobre dado de paciente devem ser direcionados
          primeiro à própria clínica (controladora); pedidos sobre a conta da clínica em si, aos
          canais de contato abaixo.
        </p>

        <h2>8. Segurança</h2>
        <p>
          Senha de acesso é armazenada com hash (nunca em texto puro), sessões usam token com prazo
          curto e renovação automática, e o acesso a dado clínico é registrado em log de auditoria.
          Cada clínica só enxerga seus próprios dados.
        </p>

        <h2>9. Contato</h2>
        <p>
          Dúvidas sobre esta política ou pedidos relacionados a dados: veja os canais de contato na
          página de <Link href="/planos">planos</Link>.
        </p>
      </div>
    </main>
  );
}
