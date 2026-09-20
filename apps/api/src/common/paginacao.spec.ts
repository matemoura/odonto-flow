import { TAMANHO_DE_PAGINA_MAXIMO, limitesDaPagina, montarPagina } from "./paginacao";

describe("limitesDaPagina", () => {
  it("usa o padrão quando nada é informado", () => {
    expect(limitesDaPagina()).toEqual({ skip: 0, take: 25, page: 1, pageSize: 25 });
  });

  it("calcula o salto a partir da página", () => {
    expect(limitesDaPagina(3, 10)).toEqual({ skip: 20, take: 10, page: 3, pageSize: 10 });
  });

  // Sem o teto, `?pageSize=999999` devolve a tabela inteira e a paginação
  // vira decoração — que é exatamente o problema que ela deveria resolver.
  it("prende o tamanho no teto, por maior que seja o pedido", () => {
    expect(limitesDaPagina(1, 999999).take).toBe(TAMANHO_DE_PAGINA_MAXIMO);
    expect(limitesDaPagina(1, Number.MAX_SAFE_INTEGER).take).toBe(TAMANHO_DE_PAGINA_MAXIMO);
  });

  it("recusa página e tamanho inválidos em vez de gerar skip negativo", () => {
    for (const invalido of [0, -5, NaN, Infinity, undefined]) {
      const limites = limitesDaPagina(invalido as number, 10);
      expect(limites.page).toBe(1);
      expect(limites.skip).toBe(0);
    }
    expect(limitesDaPagina(1, 0).pageSize).toBe(25);
    expect(limitesDaPagina(1, -3).pageSize).toBe(25);
  });

  it("trunca valor fracionário em vez de repassar ao Prisma", () => {
    expect(limitesDaPagina(2.7, 10.9)).toEqual({ skip: 10, take: 10, page: 2, pageSize: 10 });
  });
});

describe("montarPagina", () => {
  it("calcula o total de páginas arredondando para cima", () => {
    expect(montarPagina([], 101, 1, 25).totalDePaginas).toBe(5);
    expect(montarPagina([], 100, 1, 25).totalDePaginas).toBe(4);
  });

  it("lista vazia tem uma página, não zero", () => {
    // Zero páginas faria a tela mostrar "página 1 de 0".
    expect(montarPagina([], 0, 1, 25).totalDePaginas).toBe(1);
  });
});
