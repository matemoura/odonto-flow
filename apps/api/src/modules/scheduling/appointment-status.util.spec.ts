import { AppointmentStatus } from "@odontoflow/db";
import {
  STATUS_QUE_OCUPAM_HORARIO,
  TRANSICOES_PERMITIDAS,
  reocupaHorario,
  transicaoPermitida,
} from "./appointment-status.util";

const TODOS: AppointmentStatus[] = [
  "SCHEDULED",
  "CONFIRMED",
  "WAITING",
  "FILLING_FORM",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
];

describe("máquina de status da consulta", () => {
  it("o fluxo normal do dia continua inteiro", () => {
    expect(transicaoPermitida("SCHEDULED", "CONFIRMED")).toBe(true);
    expect(transicaoPermitida("CONFIRMED", "WAITING")).toBe(true);
    expect(transicaoPermitida("WAITING", "FILLING_FORM")).toBe(true);
    expect(transicaoPermitida("FILLING_FORM", "COMPLETED")).toBe(true);
  });

  // O botão "Iniciar atendimento" (AgoraAcoes) pula a marcação de chegada
  // quando o paciente já está na cadeira.
  it("dá para iniciar o atendimento sem passar por 'chegou'", () => {
    expect(transicaoPermitida("SCHEDULED", "FILLING_FORM")).toBe(true);
    expect(transicaoPermitida("CONFIRMED", "FILLING_FORM")).toBe(true);
  });

  it("cancelar e marcar falta saem de qualquer ponto antes da conclusão", () => {
    expect(transicaoPermitida("SCHEDULED", "CANCELLED")).toBe(true);
    expect(transicaoPermitida("CONFIRMED", "CANCELLED")).toBe(true);
    expect(transicaoPermitida("SCHEDULED", "NO_SHOW")).toBe(true);
    expect(transicaoPermitida("CONFIRMED", "NO_SHOW")).toBe(true);
  });

  // Isto é o que a API não checava: qualquer um dos sete valores era aceito em
  // qualquer ordem, bastando chamar a rota direto.
  it("consulta concluída é ponto final", () => {
    expect(TRANSICOES_PERMITIDAS.COMPLETED).toEqual([]);
    for (const destino of TODOS) {
      expect(transicaoPermitida("COMPLETED", destino)).toBe(false);
    }
  });

  it("cancelada não vira concluída, e falta não vira atendimento", () => {
    expect(transicaoPermitida("CANCELLED", "COMPLETED")).toBe(false);
    expect(transicaoPermitida("CANCELLED", "CONFIRMED")).toBe(false);
    expect(transicaoPermitida("NO_SHOW", "FILLING_FORM")).toBe(false);
    expect(transicaoPermitida("NO_SHOW", "COMPLETED")).toBe(false);
  });

  it("remarcar é a única saída de cancelada e de falta", () => {
    expect(TRANSICOES_PERMITIDAS.CANCELLED).toEqual(["SCHEDULED"]);
    expect(TRANSICOES_PERMITIDAS.NO_SHOW).toEqual(["SCHEDULED"]);
  });

  it("nenhum status permite transição para ele mesmo", () => {
    for (const status of TODOS) {
      expect(transicaoPermitida(status, status)).toBe(false);
    }
  });
});

describe("ocupação do horário", () => {
  // É o que faz o encaixe voltar para o link público quando alguém desmarca.
  it("cancelada e falta não ocupam o horário", () => {
    expect(STATUS_QUE_OCUPAM_HORARIO).not.toContain("CANCELLED");
    expect(STATUS_QUE_OCUPAM_HORARIO).not.toContain("NO_SHOW");
  });

  it("concluída continua ocupando — o horário foi usado de verdade", () => {
    expect(STATUS_QUE_OCUPAM_HORARIO).toContain("COMPLETED");
  });

  it("só remarcar reocupa o horário", () => {
    expect(reocupaHorario("CANCELLED", "SCHEDULED")).toBe(true);
    expect(reocupaHorario("NO_SHOW", "SCHEDULED")).toBe(true);
    // Avançar dentro do fluxo não reocupa nada: o horário nunca foi liberado.
    expect(reocupaHorario("SCHEDULED", "CONFIRMED")).toBe(false);
    expect(reocupaHorario("FILLING_FORM", "COMPLETED")).toBe(false);
    // Liberar também não.
    expect(reocupaHorario("CONFIRMED", "CANCELLED")).toBe(false);
  });
});
