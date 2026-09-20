/**
 * Paginação de lista.
 *
 * Nenhum `findMany` da API tinha `take`: toda lista devolvia a tabela inteira.
 * Numa clínica com anos de histórico isso significa a tela de pacientes
 * carregando milhares de linhas de uma vez — estouro de memória no plano free
 * do Render antes mesmo de chegar ao navegador.
 *
 * O teto de 100 não é enfeite: sem ele, `?pageSize=999999` devolve tudo de
 * novo e a paginação vira decoração.
 */
export const TAMANHO_DE_PAGINA_PADRAO = 25;
export const TAMANHO_DE_PAGINA_MAXIMO = 100;

export interface Pagina<T> {
  itens: T[];
  total: number;
  page: number;
  pageSize: number;
  /** Calculado aqui para a tela não ter que repetir a aritmética. */
  totalDePaginas: number;
}

/** Converte o que veio da query string em valores confiáveis. */
export function limitesDaPagina(page?: number, pageSize?: number): { skip: number; take: number; page: number; pageSize: number } {
  const paginaSegura = Number.isFinite(page) && (page as number) >= 1 ? Math.floor(page as number) : 1;
  const tamanhoSolicitado =
    Number.isFinite(pageSize) && (pageSize as number) >= 1
      ? Math.floor(pageSize as number)
      : TAMANHO_DE_PAGINA_PADRAO;
  const tamanhoSeguro = Math.min(tamanhoSolicitado, TAMANHO_DE_PAGINA_MAXIMO);

  return {
    skip: (paginaSegura - 1) * tamanhoSeguro,
    take: tamanhoSeguro,
    page: paginaSegura,
    pageSize: tamanhoSeguro,
  };
}

export function montarPagina<T>(itens: T[], total: number, page: number, pageSize: number): Pagina<T> {
  return {
    itens,
    total,
    page,
    pageSize,
    totalDePaginas: Math.max(1, Math.ceil(total / pageSize)),
  };
}
