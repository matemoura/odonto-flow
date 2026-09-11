import type { AgendaAppointment, AppointmentStatus } from "../../../lib/api";

const STATUS_LABEL: Record<AppointmentStatus, string> = {
  SCHEDULED: "A confirmar",
  CONFIRMED: "Confirmada",
  WAITING: "Aguardando na recepção",
  FILLING_FORM: "Preenchendo a ficha",
  NO_SHOW: "Não compareceu",
  CANCELLED: "Cancelada",
  COMPLETED: "Concluída",
};

export function statusLabel(status: AppointmentStatus) {
  return STATUS_LABEL[status];
}

/** Hora (0–23) de `date` no fuso informado — nunca o fuso do servidor. */
export function horaNoFuso(date: Date, timeZone: string): number {
  const formatter = new Intl.DateTimeFormat("en-US", { timeZone, hour: "2-digit", hourCycle: "h23" });
  return Number(formatter.format(date));
}

/** Minuto (0–59) de `date` no fuso informado. */
function minutoNoFuso(date: Date, timeZone: string): number {
  const formatter = new Intl.DateTimeFormat("en-US", { timeZone, minute: "2-digit" });
  return Number(formatter.format(date));
}

/** Data civil "YYYY-MM-DD" de `date` no fuso informado — nunca o fuso/UTC do servidor. */
export function dataIsoNoFuso(date: Date, timeZone: string): string {
  const formatter = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" });
  return formatter.format(date); // en-CA já formata como YYYY-MM-DD
}

/** "Bom dia" (até 12h), "Boa tarde" (até 18h) ou "Boa noite", no fuso da clínica. */
export function saudacao(date: Date, timeZone: string): string {
  const hour = horaNoFuso(date, timeZone);
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

function toHHmm(iso: string, timeZone: string) {
  const d = new Date(iso);
  return `${String(horaNoFuso(d, timeZone)).padStart(2, "0")}:${String(minutoNoFuso(d, timeZone)).padStart(2, "0")}`;
}

export type OcupacaoHora = "cheio" | "livre";

/**
 * Deriva o resumo do dia e a "linha do dia" a partir dos agendamentos reais.
 * Inclui o check-in do paciente (WAITING/FILLING_FORM) — a recepção marca a
 * chegada e o "resumo do dia" mostra quantos estão fisicamente esperando.
 */
export function buildAgendaView(appointments: AgendaAppointment[], now: Date, timeZone: string) {
  const ativos = appointments.filter((a) => a.status !== "CANCELLED");

  const emAndamento = ativos.find((a) => new Date(a.startAt) <= now && now <= new Date(a.endAt)) ?? null;

  const proximas = ativos
    .filter((a) => a !== emAndamento && new Date(a.startAt) > now)
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());

  const aConfirmar = ativos.filter((a) => a.status === "SCHEDULED").length;
  const faltas = ativos.filter((a) => a.status === "NO_SHOW").length;
  const aguardando = ativos.filter((a) => a.status === "WAITING" || a.status === "FILLING_FORM").length;

  const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17];
  const linhaDoDia = HOURS.map((hour) => {
    const ocupado = ativos.some((a) => {
      const start = new Date(a.startAt);
      const end = new Date(a.endAt);
      const horaFim = horaNoFuso(end, timeZone) + (minutoNoFuso(end, timeZone) > 0 ? 1 : 0);
      return horaNoFuso(start, timeZone) <= hour && hour < horaFim;
    });
    const ocupacao: OcupacaoHora = ocupado ? "cheio" : "livre";
    return { hora: String(hour).padStart(2, "0"), ocupacao };
  });

  const livresHoras = linhaDoDia.filter((b) => b.ocupacao === "livre").length;

  return {
    hoje: {
      total: ativos.length,
      aConfirmar,
      faltas,
      aguardando,
      livresLabel: `${livresHoras}h`,
    },
    emAndamento,
    proximas,
    linhaDoDia,
  };
}

export { toHHmm };

/* --- navegação por dia e semana ------------------------------------------- */

/**
 * Aritmética de calendário sobre "YYYY-MM-DD". Usa `Date.UTC` só como
 * ferramenta de cálculo, nunca como instante: somar 24h a um Date real erra a
 * borda em fuso com horário de verão, e aqui o que importa é o dia civil.
 */
export function somarDias(dataIso: string, dias: number): string {
  const [ano, mes, dia] = dataIso.split("-").map(Number);
  const d = new Date(Date.UTC(ano, mes - 1, dia + dias));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

/** Dia da semana (0 = domingo) da data civil, independente de fuso. */
export function diaDaSemana(dataIso: string): number {
  const [ano, mes, dia] = dataIso.split("-").map(Number);
  return new Date(Date.UTC(ano, mes - 1, dia)).getUTCDay();
}

/** Segunda-feira da semana que contém `dataIso` — a semana da clínica começa na segunda. */
export function inicioDaSemana(dataIso: string): string {
  const semana = diaDaSemana(dataIso);
  const recuo = semana === 0 ? 6 : semana - 1; // domingo pertence à semana que começou na segunda anterior
  return somarDias(dataIso, -recuo);
}

/** `true` se a string é uma data civil válida — protege contra `?data=` inventado na URL. */
export function dataIsoValida(valor: string | undefined): valor is string {
  if (!valor || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const [ano, mes, dia] = valor.split("-").map(Number);
  const d = new Date(Date.UTC(ano, mes - 1, dia));
  return d.getUTCFullYear() === ano && d.getUTCMonth() + 1 === mes && d.getUTCDate() === dia;
}

/** Agrupa os agendamentos por dia civil no fuso da clínica, preservando a ordem por horário. */
export function agruparPorDia(appointments: AgendaAppointment[], timeZone: string) {
  const porDia = new Map<string, AgendaAppointment[]>();
  for (const appt of appointments) {
    const chave = dataIsoNoFuso(new Date(appt.startAt), timeZone);
    const lista = porDia.get(chave);
    if (lista) lista.push(appt);
    else porDia.set(chave, [appt]);
  }
  return porDia;
}
