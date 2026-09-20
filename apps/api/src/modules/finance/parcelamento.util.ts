/**
 * Divide um total em N parcelas sem perder nem criar centavo: o resto da
 * divisão é distribuído nas primeiras parcelas. 100,00 em 3x = 33,34 + 33,33 +
 * 33,33.
 */
export function dividirEmParcelas(totalCents: number, parcelas: number): number[] {
  const base = Math.floor(totalCents / parcelas);
  const resto = totalCents - base * parcelas;
  return Array.from({ length: parcelas }, (_, i) => base + (i < resto ? 1 : 0));
}

/** Soma meses prendendo no último dia do mês alvo: 31/01 + 1 mês = 28/02, nunca 03/03. */
export function somarMeses(data: Date, meses: number): Date {
  const d = new Date(data.getTime());
  const dia = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + meses);
  const ultimoDiaDoMes = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(dia, ultimoDiaDoMes));
  return d;
}
