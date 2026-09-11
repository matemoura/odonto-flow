import Link from "next/link";
import s from "../legal.module.css";

export const metadata = { title: "Termos de Uso — Odonto Flow" };

export default function TermosPage() {
  return (
    <main id="conteudo" className={s.pagina}>
      <Link href="/" className={s.voltar}>
        ← Voltar
      </Link>
      <h1 className={s.titulo}>Termos de Uso</h1>
      <p className={s.atualizado}>Rascunho — última revisão de conteúdo: setembro de 2026.</p>

      <p className={s.aviso}>
        Este é um rascunho inicial, escrito para deixar as regras claras enquanto o produto está em
        fase inicial. Antes de usar isso como termo definitivo com clientes pagantes, recomendamos
        revisão por um advogado especializado em direito digital/consumidor.
      </p>

      <div className={s.corpo}>
        <h2>1. Quem somos e o que é o Odonto Flow</h2>
        <p>
          Odonto Flow é um software (SaaS) de gestão para clínicas odontológicas: agenda, prontuário,
          financeiro, CRM e módulos relacionados. Ao criar uma conta, a clínica (&quot;você&quot;)
          contrata o uso da plataforma nos termos abaixo.
        </p>

        <h2>2. Cadastro e conta</h2>
        <p>
          Você é responsável por manter os dados de acesso da sua clínica em sigilo e por toda
          atividade realizada com sua conta. Avise a gente imediatamente se suspeitar de uso não
          autorizado.
        </p>

        <h2>3. Uso permitido</h2>
        <p>
          O Odonto Flow deve ser usado só para a gestão legítima da sua clínica. Não é permitido tentar
          acessar dados de outra clínica, sobrecarregar a plataforma de propósito, ou usar o sistema
          para fins ilegais.
        </p>

        <h2>4. Planos e cobrança</h2>
        <p>
          Nesta fase inicial, a cobrança de assinatura ainda não é automática — o plano escolhido no
          cadastro é registrado, e qualquer cobrança será combinada diretamente com você antes de
          valer. Isso pode mudar conforme o produto evolui; avisaremos com antecedência.
        </p>

        <h2>5. Seus dados e conteúdo</h2>
        <p>
          Os dados que você cadastra (pacientes, prontuário, financeiro) são seus. O Odonto Flow atua como
          operador desses dados, seguindo suas instruções — ver nossa{" "}
          <Link href="/privacidade">Política de Privacidade</Link> para os detalhes de LGPD.
        </p>

        <h2>6. Disponibilidade</h2>
        <p>
          Fazemos o possível para manter o serviço no ar, mas não garantimos disponibilidade
          ininterrupta. Manutenções programadas serão avisadas quando possível.
        </p>

        <h2>7. Limitação de responsabilidade</h2>
        <p>
          O Odonto Flow é uma ferramenta de apoio à gestão — decisões clínicas continuam sendo de
          responsabilidade exclusiva dos profissionais de saúde da sua clínica.
        </p>

        <h2>8. Alterações nestes termos</h2>
        <p>
          Podemos atualizar estes termos conforme o produto evolui. Mudanças relevantes serão
          avisadas por e-mail ou dentro do próprio painel.
        </p>

        <h2>9. Contato</h2>
        <p>
          Dúvidas sobre estes termos: veja os canais de contato na página de{" "}
          <Link href="/planos">planos</Link>.
        </p>
      </div>
    </main>
  );
}
