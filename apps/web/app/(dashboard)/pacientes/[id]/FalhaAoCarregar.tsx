import s from "../../admin.module.css";

/**
 * Aviso de que uma seção da ficha NÃO pôde ser lida.
 *
 * Existe porque a página inteira usava `.catch(() => [])`: qualquer falha na
 * API — token expirado, banco hibernando, rede — virava lista vazia, e a tela
 * dizia "Nenhum atestado emitido ainda" para um paciente que tinha atestados.
 * Numa ficha clínica isso não é um detalhe de UX: é o sistema afirmando com
 * confiança algo que não sabe.
 *
 * O texto pede para recarregar em vez de oferecer um botão de tentar de novo
 * porque estas são páginas de servidor — recarregar é literalmente o retry.
 */
export function FalhaAoCarregar({ oQue }: { oQue: string }) {
  return (
    <p className={s.erro} role="alert">
      Não foi possível carregar {oQue} agora. Recarregue a página — o que está aqui pode estar incompleto.
    </p>
  );
}
