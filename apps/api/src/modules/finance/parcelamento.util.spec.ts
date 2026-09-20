import { dividirEmParcelas, somarMeses } from "./parcelamento.util";

/**
 * Estas duas funções sustentam todo parcelamento do sistema — e não tinham
 * teste nenhum, apesar de serem aritmética de dinheiro.
 */
describe("dividirEmParcelas", () => {
  it("não perde nem inventa centavo", () => {
    for (const [total, n] of [
      [10000, 3],
      [10000, 7],
      [1, 3],
      [99999, 12],
      [500000, 10],
    ] as const) {
      const parcelas = dividirEmParcelas(total, n);
      expect(parcelas).toHaveLength(n);
      expect(parcelas.reduce((a, b) => a + b, 0)).toBe(total);
    }
  });

  it("joga o resto nas PRIMEIRAS parcelas", () => {
    // 100,00 em 3x: a primeira paga o centavo a mais.
    expect(dividirEmParcelas(10000, 3)).toEqual([3334, 3333, 3333]);
  });

  it("parcela única devolve o total", () => {
    expect(dividirEmParcelas(19900, 1)).toEqual([19900]);
  });

  it("nenhuma parcela fica negativa quando o total é menor que o número de parcelas", () => {
    const parcelas = dividirEmParcelas(2, 5);
    expect(parcelas).toEqual([1, 1, 0, 0, 0]);
    expect(parcelas.every((v) => v >= 0)).toBe(true);
  });
});

describe("somarMeses", () => {
  // O caso que quebra a implementação ingênua: `setMonth` em 31/01 vira 03/03.
  it("prende no último dia do mês alvo em vez de vazar para o mês seguinte", () => {
    expect(somarMeses(new Date("2026-01-31T00:00:00Z"), 1).toISOString().slice(0, 10)).toBe("2026-02-28");
    expect(somarMeses(new Date("2026-01-31T00:00:00Z"), 3).toISOString().slice(0, 10)).toBe("2026-04-30");
  });

  it("acerta fevereiro em ano bissexto", () => {
    expect(somarMeses(new Date("2028-01-31T00:00:00Z"), 1).toISOString().slice(0, 10)).toBe("2028-02-29");
  });

  it("atravessa a virada do ano", () => {
    expect(somarMeses(new Date("2026-11-15T00:00:00Z"), 3).toISOString().slice(0, 10)).toBe("2027-02-15");
  });

  it("zero meses não muda a data", () => {
    const original = new Date("2026-09-18T00:00:00Z");
    expect(somarMeses(original, 0).toISOString()).toBe(original.toISOString());
  });

  it("não modifica a data recebida", () => {
    const original = new Date("2026-01-31T00:00:00Z");
    somarMeses(original, 5);
    expect(original.toISOString().slice(0, 10)).toBe("2026-01-31");
  });
});
