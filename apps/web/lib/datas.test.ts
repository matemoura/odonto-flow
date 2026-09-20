import { formatarData, formatarDataHora } from "./datas";

/**
 * O bug que isto tranca: `Intl.DateTimeFormat("pt-BR")` sem `timeZone` usa o
 * fuso do PROCESSO. As páginas do painel renderizam no servidor, que em
 * produção roda em UTC — então uma data das primeiras horas do dia em São
 * Paulo aparecia com a data do dia anterior.
 */
describe("formatarData", () => {
  // 18/09/2026 às 01:00 em São Paulo = 04:00Z. Em UTC esse instante ainda é
  // dia 18; o caso perigoso é o contrário — ver o teste seguinte.
  it("mostra a data do dia civil DA CLÍNICA, não a do servidor", () => {
    // 19/09 às 00:30Z ainda é 18/09 às 21:30 em São Paulo.
    const instante = "2026-09-19T00:30:00.000Z";
    expect(formatarData(instante, "America/Sao_Paulo")).toBe("18/09/2026");
    expect(formatarData(instante, "UTC")).toBe("19/09/2026");
    expect(formatarData(instante, "Asia/Tokyo")).toBe("19/09/2026");
  });

  it("a meia-noite da clínica não escorrega para o dia anterior", () => {
    // Meia-noite de 18/09 em São Paulo.
    expect(formatarData("2026-09-18T03:00:00.000Z", "America/Sao_Paulo")).toBe("18/09/2026");
  });

  // O helper antigo do painel da plataforma tratava nulo; as 9 formatações
  // espalhadas pelas telas, não — davam "Invalid Date" na cara do usuário.
  it("nulo e data inválida viram travessão, nunca 'Invalid Date'", () => {
    expect(formatarData(null, "UTC")).toBe("—");
    expect(formatarData(undefined, "UTC")).toBe("—");
    expect(formatarData("", "UTC")).toBe("—");
    expect(formatarData("nao-e-data", "UTC")).toBe("—");
  });

  it("aceita Date além de string", () => {
    expect(formatarData(new Date("2026-09-18T12:00:00.000Z"), "America/Sao_Paulo")).toBe("18/09/2026");
  });
});

describe("formatarDataHora", () => {
  it("mostra a hora de parede da clínica", () => {
    const instante = "2026-09-18T12:00:00.000Z";
    expect(formatarDataHora(instante, "America/Sao_Paulo")).toBe("18/09/2026 às 09:00");
    expect(formatarDataHora(instante, "UTC")).toBe("18/09/2026 às 12:00");
  });

  it("nulo vira travessão", () => {
    expect(formatarDataHora(null, "UTC")).toBe("—");
  });
});
