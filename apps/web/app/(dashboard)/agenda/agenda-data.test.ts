import {
  buildAgendaView,
  dataIsoNoFuso,
  dataIsoValida,
  inicioDaSemana,
  saudacao,
  somarDias,
  statusLabel,
  toHHmm,
} from "./agenda-data";
import type { AgendaAppointment } from "../../../lib/api";

/**
 * buildAgendaView agora recebe o fuso explicitamente (não lê mais
 * `.getHours()` do servidor) — os testes usam o fuso do próprio ambiente que
 * roda o teste, o mesmo que `localIso` já usava implicitamente, então o
 * comportamento aqui continua sem depender de qual fuso é esse.
 */
const FUSO_TESTE = Intl.DateTimeFormat().resolvedOptions().timeZone;

function localIso(hour: number, minute = 0) {
  const d = new Date(2026, 8, 9, hour, minute, 0);
  return d.toISOString();
}

function appointment(overrides: Partial<AgendaAppointment>): AgendaAppointment {
  return {
    id: overrides.id ?? "a1",
    startAt: localIso(10),
    endAt: localIso(10, 40),
    status: "SCHEDULED",
    source: "internal",
    patient: { id: "p1", name: "Paciente" },
    professional: { id: "prof1", user: { name: "Dra. Ana" } },
    ...overrides,
  };
}

describe("buildAgendaView", () => {
  it("identifica o atendimento em andamento (now entre startAt e endAt)", () => {
    const now = new Date(2026, 8, 9, 10, 20);
    const emCurso = appointment({ id: "atual", startAt: localIso(10), endAt: localIso(10, 40) });
    const futura = appointment({ id: "futura", startAt: localIso(14), endAt: localIso(14, 40) });

    const view = buildAgendaView([emCurso, futura], now, FUSO_TESTE);

    expect(view.emAndamento?.id).toBe("atual");
    expect(view.proximas.map((a) => a.id)).toEqual(["futura"]);
  });

  it("próximas só inclui consultas futuras, ordenadas, sem canceladas nem a em andamento", () => {
    const now = new Date(2026, 8, 9, 9, 0);
    const cedo = appointment({ id: "cedo", startAt: localIso(11), endAt: localIso(11, 40) });
    const tarde = appointment({ id: "tarde", startAt: localIso(15), endAt: localIso(15, 40) });
    const passada = appointment({ id: "passada", startAt: localIso(8), endAt: localIso(8, 40) });
    const cancelada = appointment({
      id: "cancelada",
      status: "CANCELLED",
      startAt: localIso(12),
      endAt: localIso(12, 40),
    });

    const view = buildAgendaView([tarde, cedo, passada, cancelada], now, FUSO_TESTE);

    expect(view.proximas.map((a) => a.id)).toEqual(["cedo", "tarde"]);
    expect(view.hoje.total).toBe(3); // exclui a cancelada
  });

  it("conta a-confirmar e faltas corretamente", () => {
    const now = new Date(2026, 8, 9, 7, 0);
    const aConfirmar1 = appointment({ id: "s1", status: "SCHEDULED", startAt: localIso(9), endAt: localIso(9, 40) });
    const aConfirmar2 = appointment({ id: "s2", status: "SCHEDULED", startAt: localIso(10), endAt: localIso(10, 40) });
    const falta = appointment({ id: "n1", status: "NO_SHOW", startAt: localIso(8), endAt: localIso(8, 40) });

    const view = buildAgendaView([aConfirmar1, aConfirmar2, falta], now, FUSO_TESTE);

    expect(view.hoje.aConfirmar).toBe(2);
    expect(view.hoje.faltas).toBe(1);
  });

  it("conta quem chegou (aguardando na recepção ou preenchendo a ficha) como 'aguardando'", () => {
    const now = new Date(2026, 8, 9, 9, 0);
    const naRecepcao = appointment({ id: "w1", status: "WAITING", startAt: localIso(9, 30), endAt: localIso(10, 10) });
    const naFicha = appointment({
      id: "w2",
      status: "FILLING_FORM",
      startAt: localIso(10),
      endAt: localIso(10, 40),
    });
    const confirmada = appointment({ id: "c1", status: "CONFIRMED", startAt: localIso(11), endAt: localIso(11, 40) });

    const view = buildAgendaView([naRecepcao, naFicha, confirmada], now, FUSO_TESTE);

    expect(view.hoje.aguardando).toBe(2);
  });

  it("marca a hora de uma consulta ativa como 'cheio' na linha do dia", () => {
    const now = new Date(2026, 8, 9, 7, 0);
    const consulta = appointment({ startAt: localIso(14), endAt: localIso(14, 40) });

    const view = buildAgendaView([consulta], now, FUSO_TESTE);
    const bloco14h = view.linhaDoDia.find((b) => b.hora === "14");
    const bloco09h = view.linhaDoDia.find((b) => b.hora === "09");

    expect(bloco14h?.ocupacao).toBe("cheio");
    expect(bloco09h?.ocupacao).toBe("livre");
  });

  it("statusLabel traduz os status para rótulos em português", () => {
    expect(statusLabel("NO_SHOW")).toBe("Não compareceu");
    expect(statusLabel("CONFIRMED")).toBe("Confirmada");
  });

  it("agrupa a linha do dia no fuso informado, não no fuso do ambiente que roda o código", () => {
    // 10:30 em America/Sao_Paulo (UTC-3) é 13:30 em UTC — o mesmo instante
    // cai em baldes de hora diferentes dependendo do fuso passado.
    const consulta = appointment({ startAt: "2026-09-09T13:30:00.000Z", endAt: "2026-09-09T14:10:00.000Z" });
    const now = new Date("2026-09-09T12:00:00.000Z");

    const viewSaoPaulo = buildAgendaView([consulta], now, "America/Sao_Paulo");
    expect(viewSaoPaulo.linhaDoDia.find((b) => b.hora === "10")?.ocupacao).toBe("cheio");
    expect(viewSaoPaulo.linhaDoDia.find((b) => b.hora === "13")?.ocupacao).toBe("livre");

    const viewUtc = buildAgendaView([consulta], now, "UTC");
    expect(viewUtc.linhaDoDia.find((b) => b.hora === "13")?.ocupacao).toBe("cheio");
    expect(viewUtc.linhaDoDia.find((b) => b.hora === "10")?.ocupacao).toBe("livre");
  });
});

describe("dataIsoNoFuso", () => {
  it("usa o fuso informado — perto da meia-noite UTC já pode ser outro dia civil em Brasília", () => {
    const instante = new Date("2026-09-10T02:30:00.000Z"); // já é dia 10 em UTC...
    expect(dataIsoNoFuso(instante, "America/Sao_Paulo")).toBe("2026-09-09"); // ...mas ainda dia 9 em Brasília (UTC-3)
    expect(dataIsoNoFuso(instante, "UTC")).toBe("2026-09-10");
  });
});

describe("toHHmm", () => {
  it("mostra a hora no fuso informado, não no fuso do ambiente que roda o código", () => {
    const iso = "2026-09-09T14:30:00.000Z";
    expect(toHHmm(iso, "America/Sao_Paulo")).toBe("11:30");
    expect(toHHmm(iso, "Europe/Lisbon")).toBe("15:30");
  });
});

describe("saudacao", () => {
  it("usa o fuso horário da clínica, não o do ambiente que roda o código", () => {
    const instante = new Date("2026-09-09T14:30:00.000Z");

    expect(saudacao(instante, "America/Sao_Paulo")).toBe("Bom dia"); // 11:30 local
    expect(saudacao(instante, "Europe/Lisbon")).toBe("Boa tarde"); // 15:30 local
    expect(saudacao(instante, "Asia/Tokyo")).toBe("Boa noite"); // 23:30 local
  });

  it("troca exatamente às 12h e às 18h no fuso da clínica", () => {
    expect(saudacao(new Date("2026-09-09T14:59:00.000Z"), "America/Sao_Paulo")).toBe("Bom dia"); // 11:59
    expect(saudacao(new Date("2026-09-09T15:00:00.000Z"), "America/Sao_Paulo")).toBe("Boa tarde"); // 12:00
    expect(saudacao(new Date("2026-09-09T20:59:00.000Z"), "America/Sao_Paulo")).toBe("Boa tarde"); // 17:59
    expect(saudacao(new Date("2026-09-09T21:00:00.000Z"), "America/Sao_Paulo")).toBe("Boa noite"); // 18:00
  });
});

describe("navegação por dia e semana", () => {
  it("soma e subtrai dias atravessando a virada de mês e de ano", () => {
    expect(somarDias("2026-09-14", 1)).toBe("2026-09-15");
    expect(somarDias("2026-09-30", 1)).toBe("2026-10-01");
    expect(somarDias("2026-01-01", -1)).toBe("2025-12-31");
    expect(somarDias("2026-09-14", 7)).toBe("2026-09-21");
  });

  it("respeita ano bissexto", () => {
    expect(somarDias("2028-02-28", 1)).toBe("2028-02-29");
    expect(somarDias("2026-02-28", 1)).toBe("2026-03-01");
  });

  it("a semana começa na segunda-feira", () => {
    expect(inicioDaSemana("2026-09-14")).toBe("2026-09-14"); // já é segunda
    expect(inicioDaSemana("2026-09-17")).toBe("2026-09-14"); // quinta
    expect(inicioDaSemana("2026-09-19")).toBe("2026-09-14"); // sábado
  });

  // O domingo é o caso que erra fácil: `getUTCDay()` devolve 0, e um
  // `semana - 1` ingênuo recuaria -1 dia, jogando a semana para a segunda
  // SEGUINTE em vez da anterior.
  it("coloca o domingo na semana que começou na segunda anterior", () => {
    expect(inicioDaSemana("2026-09-20")).toBe("2026-09-14");
    expect(inicioDaSemana("2026-09-13")).toBe("2026-09-07");
  });

  it("recusa data inválida vinda da URL", () => {
    expect(dataIsoValida("2026-09-14")).toBe(true);
    expect(dataIsoValida(undefined)).toBe(false);
    expect(dataIsoValida("hoje")).toBe(false);
    expect(dataIsoValida("2026-9-4")).toBe(false);
    expect(dataIsoValida("2026-02-30")).toBe(false); // dia que não existe
    expect(dataIsoValida("2026-13-01")).toBe(false); // mês que não existe
  });
});
