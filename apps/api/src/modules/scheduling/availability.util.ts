/**
 * Cálculo de disponibilidade — regra fixa por enquanto (08h–12h e 13h–18h,
 * slots de 40min, fechado aos domingos, sábado fechado). Quando a clínica
 * precisar de horários configuráveis por profissional, isso vira dado no
 * banco (ex. WorkingHours por Professional) em vez de constante.
 *
 * Toda a aritmética de calendário aqui é feita em Y/M/D "puros" (via
 * `Date.UTC` só como ferramenta de cálculo, nunca como instante real) — quem
 * decide o que é "hoje" no fuso da clínica é `timezone.util.ts`. Isso evita
 * depender do fuso horário do servidor.
 */
export const SLOT_DURATION_MINUTES = 40;
const MORNING = { startHour: 8, endHour: 12 };
const AFTERNOON = { startHour: 13, endHour: 18 };

const WEEKDAY_LABELS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

export interface CalendarDay {
  year: number;
  month: number;
  day: number;
  weekday: number;
}

export function isSunday(weekday: number): boolean {
  return weekday === 0;
}

export function isClosedDay(weekday: number): boolean {
  return weekday === 6; // sábado fechado
}

/** Horários de funcionamento do dia, em "HH:mm", ignorando se o dia está fechado. */
export function getWorkingSlots(): string[] {
  const slots: string[] = [];
  for (const period of [MORNING, AFTERNOON]) {
    for (let minutes = period.startHour * 60; minutes < period.endHour * 60; minutes += SLOT_DURATION_MINUTES) {
      const hh = String(Math.floor(minutes / 60)).padStart(2, "0");
      const mm = String(minutes % 60).padStart(2, "0");
      slots.push(`${hh}:${mm}`);
    }
  }
  return slots;
}

export function isoDate(day: CalendarDay): string {
  return `${day.year}-${String(day.month).padStart(2, "0")}-${String(day.day).padStart(2, "0")}`;
}

export function weekdayLabel(day: CalendarDay): string {
  return WEEKDAY_LABELS[day.weekday];
}

function toCalendarDay(utcMidnight: Date): CalendarDay {
  return {
    year: utcMidnight.getUTCFullYear(),
    month: utcMidnight.getUTCMonth() + 1,
    day: utcMidnight.getUTCDate(),
    weekday: utcMidnight.getUTCDay(),
  };
}

/** Próximos `count` dias a partir de `from` (inclusive, no fuso da clínica), pulando domingos. */
export function nextBookableDays(from: { year: number; month: number; day: number }, count: number): CalendarDay[] {
  const days: CalendarDay[] = [];
  let cursor = Date.UTC(from.year, from.month - 1, from.day);
  while (days.length < count) {
    const candidate = toCalendarDay(new Date(cursor));
    if (!isSunday(candidate.weekday)) {
      days.push(candidate);
    }
    cursor += 24 * 60 * 60 * 1000;
  }
  return days;
}
