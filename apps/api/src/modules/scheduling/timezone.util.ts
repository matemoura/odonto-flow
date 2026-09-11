/**
 * Conversões de fuso horário sem dependência nova — usa só `Intl` (nativo do
 * Node). Cada clínica tem seu próprio fuso (`Clinic.timezone`, ex.
 * "America/Sao_Paulo"); antes desta correção, a agenda assumia o fuso do
 * servidor, o que quebra em produção se a API rodar num servidor em UTC.
 */

export interface ZonedDateParts {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
  /** 0 (domingo) a 6 (sábado) — calculado a partir de year/month/day, não do relógio. */
  weekday: number;
}

/** Decompõe um instante UTC nos componentes de data/hora vistos no fuso da clínica. */
export function getZonedParts(date: Date, timeZone: string): ZonedDateParts {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const parts = Object.fromEntries(formatter.formatToParts(date).map((p) => [p.type, p.value]));
  const year = Number(parts.year);
  const month = Number(parts.month);
  const day = Number(parts.day);
  const hour = Number(parts.hour);
  const minute = Number(parts.minute);
  // dia da semana é independente de hora/fuso-horário-intraday: usa só a data civil
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();

  return { year, month, day, hour, minute, weekday };
}

/**
 * Converte um horário de parede (ano/mês/dia/hora/minuto) no fuso da clínica
 * para o instante UTC correspondente. Usa busca por aproximação sucessiva
 * (2 iterações bastam fora do instante exato de transição de DST — e o
 * Brasil não usa mais horário de verão desde 2019).
 */
export function zonedTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
): Date {
  let guess = new Date(Date.UTC(year, month - 1, day, hour, minute));

  for (let i = 0; i < 2; i++) {
    const seen = getZonedParts(guess, timeZone);
    const seenAsUtc = Date.UTC(seen.year, seen.month - 1, seen.day, seen.hour, seen.minute);
    const wantedAsUtc = Date.UTC(year, month - 1, day, hour, minute);
    const diff = wantedAsUtc - seenAsUtc;
    if (diff === 0) break;
    guess = new Date(guess.getTime() + diff);
  }

  return guess;
}

/** Atalho para `zonedTimeToUtc` a partir de uma data "YYYY-MM-DD" + hora "HH:mm". */
export function zonedDateTimeToUtc(dateIso: string, time: string, timeZone: string): Date {
  const [year, month, day] = dateIso.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  return zonedTimeToUtc(year, month, day, hour, minute, timeZone);
}

/**
 * Limites UTC de um período informado como duas datas civis "YYYY-MM-DD",
 * lidas no fuso da CLÍNICA.
 *
 * Existe para não repetir `new Date(`${from}T00:00:00`)`, que é o erro que já
 * apareceu em quatro serviços: uma string sem sufixo de fuso é interpretada no
 * fuso do PROCESSO, então num servidor em UTC o dia 01/07 de uma clínica em
 * São Paulo começa às 21h de 30/06 — e todo total de período sai deslocado nas
 * bordas.
 */
export function zonedPeriodBoundsUtc(from: string, to: string, timeZone: string): { start: Date; end: Date } {
  const start = zonedDateTimeToUtc(from, "00:00", timeZone);
  // `zonedDateTimeToUtc` só aceita HH:mm; +59.999 ms fecha o dia em 23:59:59.999.
  const end = new Date(zonedDateTimeToUtc(to, "23:59", timeZone).getTime() + 59_999);
  return { start, end };
}

export function formatZonedIsoDate(date: Date, timeZone: string): string {
  const { year, month, day } = getZonedParts(date, timeZone);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function formatZonedTime(date: Date, timeZone: string): string {
  const { hour, minute } = getZonedParts(date, timeZone);
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}
