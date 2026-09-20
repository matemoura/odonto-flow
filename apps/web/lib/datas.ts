/**
 * Formatação de data para exibição, SEMPRE no fuso da clínica.
 *
 * `new Intl.DateTimeFormat("pt-BR").format(...)` sem `timeZone` usa o fuso do
 * PROCESSO. Nas páginas do painel, que renderizam no servidor, o processo é o
 * container — que em produção roda em UTC. Uma consulta das primeiras horas do
 * dia em São Paulo era exibida com a data do dia anterior.
 *
 * É o mesmo erro que o backend já corrigiu no atestado, com o comentário
 * explicando exatamente este sintoma (certificates.service.ts). Aqui ele
 * sobrevivia em dez lugares diferentes, cada um reimplementando a formatação.
 */

/** Usado quando a clínica não pôde ser lida — é onde estão as clínicas hoje. */
export const FUSO_PADRAO = "America/Sao_Paulo";

/**
 * Fuso da própria plataforma, para telas que misturam várias clínicas (o
 * painel do dono). Ali não existe "a" clínica: mostrar cada linha no fuso dela
 * tornaria a coluna incomparável entre si.
 */
export const FUSO_DA_PLATAFORMA = "America/Sao_Paulo";

/** "18/09/2026". Nulo vira travessão — nunca "Invalid Date". */
export function formatarData(iso: string | Date | null | undefined, timeZone: string): string {
  const data = paraData(iso);
  if (!data) return "—";
  return new Intl.DateTimeFormat("pt-BR", { timeZone }).format(data);
}

/** "18/09/2026 às 14:30". */
export function formatarDataHora(iso: string | Date | null | undefined, timeZone: string): string {
  const data = paraData(iso);
  if (!data) return "—";
  const dia = new Intl.DateTimeFormat("pt-BR", { timeZone }).format(data);
  const hora = new Intl.DateTimeFormat("pt-BR", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
  }).format(data);
  return `${dia} às ${hora}`;
}

function paraData(valor: string | Date | null | undefined): Date | null {
  if (!valor) return null;
  const data = valor instanceof Date ? valor : new Date(valor);
  return Number.isNaN(data.getTime()) ? null : data;
}
