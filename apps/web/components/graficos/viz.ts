/**
 * Utilitários dos gráficos. SVG na mão de propósito: os gráficos daqui são
 * simples (colunas, barras, empilhada) e assim eles herdam os tokens do Odonto Flow
 * sem arrastar uma biblioteca de ~500KB para dentro do bundle.
 *
 * Paleta validada com o script do skill de dataviz contra a superfície real
 * (#faf7f2): série única usa a cor da marca (#1e4638, 9.88:1) e as séries
 * categóricas usam os 3 primeiros slots documentados (pior par adjacente
 * ΔE 9.2 sob deuteranopia, ΔE 27.6 em visão normal). Laranja e verde-água
 * ficam abaixo de 3:1 de contraste, então todo gráfico multi-série sai com
 * legenda + rótulos diretos + tabela (a "regra de alívio" do método).
 */

export const CORES = {
  marca: "#1e4638",
  serie1: "#2a78d6",
  serie2: "#eb6834",
  serie3: "#1baf7a",
  neutro: "#898781",
  bom: "#0ca30c",
  atencao: "#fab219",
  critico: "#d03b3b",
} as const;

/** Caminho de coluna: cantos de cima arredondados, base reta (o dado cresce da linha zero). */
export function caminhoColuna(x: number, y: number, largura: number, altura: number, raio = 4): string {
  if (altura <= 0) return "";
  const r = Math.min(raio, largura / 2, altura);
  return [
    `M ${x} ${y + altura}`,
    `L ${x} ${y + r}`,
    `Q ${x} ${y} ${x + r} ${y}`,
    `L ${x + largura - r} ${y}`,
    `Q ${x + largura} ${y} ${x + largura} ${y + r}`,
    `L ${x + largura} ${y + altura}`,
    "Z",
  ].join(" ");
}

/** Caminho de barra horizontal: ponta direita arredondada, início reto. */
export function caminhoBarra(x: number, y: number, largura: number, altura: number, raio = 4): string {
  if (largura <= 0) return "";
  const r = Math.min(raio, altura / 2, largura);
  return [
    `M ${x} ${y}`,
    `L ${x + largura - r} ${y}`,
    `Q ${x + largura} ${y} ${x + largura} ${y + r}`,
    `L ${x + largura} ${y + altura - r}`,
    `Q ${x + largura} ${y + altura} ${x + largura - r} ${y + altura}`,
    `L ${x} ${y + altura}`,
    "Z",
  ].join(" ");
}

/** Marcas de eixo em números redondos (0 / 500 / 1.000...), sempre incluindo o zero. */
export function marcasDoEixo(maximo: number, quantidade = 4): number[] {
  if (maximo <= 0) return [0];
  const passoBruto = maximo / quantidade;
  const magnitude = 10 ** Math.floor(Math.log10(passoBruto));
  const normalizado = passoBruto / magnitude;
  const passo = (normalizado <= 1 ? 1 : normalizado <= 2 ? 2 : normalizado <= 5 ? 5 : 10) * magnitude;
  const marcas: number[] = [];
  for (let valor = 0; valor <= maximo + passo / 2; valor += passo) {
    marcas.push(valor);
  }
  return marcas;
}

export function formatarReais(cents: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

/** Versão curta para caber em eixo/rótulo: R$ 12,5 mil. */
export function formatarReaisCurto(cents: number): string {
  const reais = cents / 100;
  if (Math.abs(reais) >= 1000) {
    return `R$ ${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(reais / 1000)} mil`;
  }
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(reais);
}

export function formatarInteiro(valor: number): string {
  return new Intl.NumberFormat("pt-BR").format(valor);
}

/**
 * Os gráficos são Client Components e as páginas que os usam são Server
 * Components — função não atravessa essa fronteira (não é serializável). Por
 * isso a página manda o NOME do formato e o gráfico resolve a função aqui.
 */
export type Formato = "reais" | "inteiro";

export const FORMATADORES: Record<Formato, { completo: (valor: number) => string; eixo: (valor: number) => string }> = {
  reais: { completo: formatarReais, eixo: formatarReaisCurto },
  inteiro: { completo: formatarInteiro, eixo: formatarInteiro },
};

const MES_CURTO = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** "2026-09" -> "set/26" (rótulo de eixo). */
export function rotuloMes(mes: string): string {
  const [ano, numero] = mes.split("-");
  return `${MES_CURTO[Number(numero) - 1]}/${ano.slice(2)}`;
}
