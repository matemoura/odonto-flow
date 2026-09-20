import { AppointmentStatus } from "@odontoflow/db";

/**
 * Para onde cada status pode ir.
 *
 * Antes esta máquina existia só como COMENTÁRIO no componente do front: a API
 * aceitava qualquer um dos sete valores em qualquer ordem, então uma consulta
 * concluída podia voltar a "agendada" e uma cancelada pular direto para
 * "concluída" — bastava uma chamada direta à rota.
 *
 * Duas entradas merecem explicação:
 *
 * - `SCHEDULED`/`CONFIRMED` alcançam `FILLING_FORM` sem passar por `WAITING`
 *   porque a agenda tem o botão "Iniciar atendimento" (ver AgoraAcoes), usado
 *   quando o paciente já está na cadeira e ninguém marcou a chegada.
 * - `COMPLETED` é terminal. Desfazer um atendimento concluído apagaria o
 *   registro de que ele aconteceu; o caminho certo é corrigir o prontuário.
 */
export const TRANSICOES_PERMITIDAS: Record<AppointmentStatus, AppointmentStatus[]> = {
  SCHEDULED: ["CONFIRMED", "WAITING", "FILLING_FORM", "NO_SHOW", "CANCELLED"],
  CONFIRMED: ["WAITING", "FILLING_FORM", "NO_SHOW", "CANCELLED"],
  WAITING: ["FILLING_FORM", "NO_SHOW", "CANCELLED"],
  FILLING_FORM: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: ["SCHEDULED"],
  NO_SHOW: ["SCHEDULED"],
};

/**
 * Status que ocupam o horário do profissional. Cancelada e falta NÃO ocupam —
 * é justamente o que libera o encaixe de volta no link público.
 */
export const STATUS_QUE_OCUPAM_HORARIO: AppointmentStatus[] = [
  "SCHEDULED",
  "CONFIRMED",
  "WAITING",
  "FILLING_FORM",
  "COMPLETED",
];

/**
 * Voltar para `SCHEDULED` reocupa o horário original. Como ele foi liberado
 * enquanto a consulta estava cancelada/como falta, outra pessoa pode tê-lo
 * pegado — daí a necessidade de checar conflito antes, em vez de criar uma
 * sobreposição silenciosa na agenda do profissional.
 */
export function reocupaHorario(de: AppointmentStatus, para: AppointmentStatus): boolean {
  return !STATUS_QUE_OCUPAM_HORARIO.includes(de) && STATUS_QUE_OCUPAM_HORARIO.includes(para);
}

export function transicaoPermitida(de: AppointmentStatus, para: AppointmentStatus): boolean {
  return TRANSICOES_PERMITIDAS[de].includes(para);
}

/**
 * Rótulos para a MENSAGEM DE ERRO da API — "uma consulta concluída não pode
 * passar para agendada" diz o que aconteceu; "COMPLETED → SCHEDULED" não diz.
 * A tela tem os próprios rótulos de exibição (agenda-data.ts).
 */
export const ROTULO_STATUS: Record<AppointmentStatus, string> = {
  SCHEDULED: "agendada",
  CONFIRMED: "confirmada",
  WAITING: "com o paciente aguardando",
  FILLING_FORM: "em atendimento",
  COMPLETED: "concluída",
  CANCELLED: "cancelada",
  NO_SHOW: "marcada como falta",
};
