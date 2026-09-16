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

/**
 * Dias de atendimento padrão (segunda a sexta) — usado quando a clínica ainda
 * não tem a configuração salva. Mesma regra que existia fixa aqui antes.
 */
export const DIAS_PADRAO = [1, 2, 3, 4, 5];

/**
 * A clínica atende nesse dia da semana?
 *
 * Antes eram duas funções separadas (`isSunday` e `isClosedDay`) e elas não
 * eram aplicadas nos mesmos lugares: a criação do agendamento barrava sábado e
 * domingo, mas `getAvailability` só barrava sábado — então pedir a grade de um
 * domingo devolvia a agenda inteira como livre, e só na hora de marcar a API
 * recusava. Uma pergunta só, respondida do mesmo jeito em todo lugar, elimina
 * essa classe de divergência.
 */
export function atendeNoDia(weekday: number, diasDeAtendimento: readonly number[]): boolean {
  return diasDeAtendimento.includes(weekday);
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

/**
 * Próximos `count` dias de ATENDIMENTO a partir de `from` (inclusive, no fuso
 * da clínica). Só dias em que a clínica abre — quem escolhe no agendamento
 * público não deveria ver um dia que não pode escolher.
 *
 * O laço tem um teto: com `diasDeAtendimento` vazio (clínica que fechou todos
 * os dias) ele rodaria para sempre procurando um dia que não existe.
 */
export function nextBookableDays(
  from: { year: number; month: number; day: number },
  count: number,
  diasDeAtendimento: readonly number[],
): CalendarDay[] {
  if (diasDeAtendimento.length === 0) return [];

  const days: CalendarDay[] = [];
  let cursor = Date.UTC(from.year, from.month - 1, from.day);
  // 7 dias por dia procurado é folga de sobra: mesmo abrindo um dia só na
  // semana, cada volta de 7 dias entrega um resultado.
  const limite = count * 7 + 7;
  for (let i = 0; i < limite && days.length < count; i++) {
    const candidate = toCalendarDay(new Date(cursor));
    if (atendeNoDia(candidate.weekday, diasDeAtendimento)) {
      days.push(candidate);
    }
    cursor += 24 * 60 * 60 * 1000;
  }
  return days;
}
