/**
 * Cálculo de disponibilidade. Dias de atendimento, expediente e duração do
 * encaixe vêm da CLÍNICA (`Clinic`, configurados na tela de Organização) — este
 * arquivo só sabe fazer a conta, não guarda mais nenhuma regra própria.
 *
 * Toda a aritmética de calendário aqui é feita em Y/M/D "puros" (via
 * `Date.UTC` só como ferramenta de cálculo, nunca como instante real) — quem
 * decide o que é "hoje" no fuso da clínica é `timezone.util.ts`. Isso evita
 * depender do fuso horário do servidor.
 */

/** Expediente da clínica, em minutos desde a meia-noite. */
export interface ExpedienteDaClinica {
  morningStartMinutes: number;
  morningEndMinutes: number;
  afternoonStartMinutes: number;
  afternoonEndMinutes: number;
  slotDurationMinutes: number;
}

/** Os padrões são exatamente a regra fixa que existia aqui antes. */
export const EXPEDIENTE_PADRAO: ExpedienteDaClinica = {
  morningStartMinutes: 8 * 60,
  morningEndMinutes: 12 * 60,
  afternoonStartMinutes: 13 * 60,
  afternoonEndMinutes: 18 * 60,
  slotDurationMinutes: 40,
};

const WEEKDAY_LABELS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

/** Minutos desde a meia-noite para "HH:mm". */
export function minutosParaHora(minutos: number): string {
  const hh = String(Math.floor(minutos / 60)).padStart(2, "0");
  const mm = String(minutos % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

/** "HH:mm" para minutos desde a meia-noite. */
export function horaParaMinutos(hora: string): number {
  const [hh, mm] = hora.split(":").map(Number);
  return hh * 60 + mm;
}

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

/**
 * Horários de funcionamento do dia, em "HH:mm", ignorando se o dia está
 * fechado.
 *
 * O fim da janela limita onde o encaixe COMEÇA, não onde termina — é a regra
 * que já valia aqui antes de o expediente virar configuração, e mantê-la
 * significa que os padrões produzem exatamente a mesma grade de sempre.
 * Consequência a conhecer: com tarde até 18:00 e encaixe de 40min, o último
 * começa 17:40 e termina 18:20. Mudar isso tiraria um horário que as clínicas
 * já usam, então é decisão de produto, não ajuste de refatoração.
 *
 * Janela com início >= fim não gera encaixe nenhum (em vez de laço infinito ou
 * horário nascendo depois do fechamento) — a validação do DTO já recusa isso,
 * e aqui é a rede embaixo dela.
 */
export function getWorkingSlots(expediente: ExpedienteDaClinica = EXPEDIENTE_PADRAO): string[] {
  const duracao = expediente.slotDurationMinutes;
  if (duracao <= 0) return [];

  const janelas = [
    { inicio: expediente.morningStartMinutes, fim: expediente.morningEndMinutes },
    { inicio: expediente.afternoonStartMinutes, fim: expediente.afternoonEndMinutes },
  ];

  const slots: string[] = [];
  for (const janela of janelas) {
    for (let minutos = janela.inicio; minutos < janela.fim; minutos += duracao) {
      slots.push(minutosParaHora(minutos));
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
