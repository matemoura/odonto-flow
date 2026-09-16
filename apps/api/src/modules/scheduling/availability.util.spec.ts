import {
  atendeNoDia,
  DIAS_PADRAO,
  getWorkingSlots,
  isoDate,
  nextBookableDays,
  weekdayLabel,
} from "./availability.util";

describe("availability.util", () => {
  it("gera slots de 40min pulando o horário de almoço (12h-13h)", () => {
    const slots = getWorkingSlots();
    expect(slots[0]).toBe("08:00");
    expect(slots).not.toContain("12:00");
    expect(slots).not.toContain("12:20");
    expect(slots).toContain("13:00");
    expect(slots[slots.length - 1]).toBe("17:40");
  });

  it("o padrão é segunda a sexta — a mesma agenda que a regra fixa anterior dava", () => {
    expect(DIAS_PADRAO).toEqual([1, 2, 3, 4, 5]);
    expect(atendeNoDia(0, DIAS_PADRAO)).toBe(false); // domingo
    expect(atendeNoDia(3, DIAS_PADRAO)).toBe(true); // quarta
    expect(atendeNoDia(6, DIAS_PADRAO)).toBe(false); // sábado
  });

  it("respeita os dias que a clínica configurou, inclusive fim de semana", () => {
    const sabadoTambem = [1, 2, 3, 4, 5, 6];
    expect(atendeNoDia(6, sabadoTambem)).toBe(true);

    const soTercaEQuinta = [2, 4];
    expect(atendeNoDia(2, soTercaEQuinta)).toBe(true);
    expect(atendeNoDia(3, soTercaEQuinta)).toBe(false);
  });

  it("nextBookableDays devolve só dias de atendimento, sem depender do fuso do servidor", () => {
    // 2026-09-12 é um sábado; com o padrão seg-sex ele não entra.
    const days = nextBookableDays({ year: 2026, month: 9, day: 12 }, 6, DIAS_PADRAO);

    expect(days).toHaveLength(6);
    expect(days.every((d) => atendeNoDia(d.weekday, DIAS_PADRAO))).toBe(true);
    expect(isoDate(days[0])).toBe("2026-09-14"); // pulou sábado 12 e domingo 13
    expect(weekdayLabel(days[0])).toBe("seg");
    expect(isoDate(days[4])).toBe("2026-09-18"); // sexta
    expect(isoDate(days[5])).toBe("2026-09-21"); // pulou o fim de semana
  });

  it("uma clínica que abre sábado vê o sábado na lista", () => {
    const days = nextBookableDays({ year: 2026, month: 9, day: 12 }, 3, [1, 2, 3, 4, 5, 6]);

    expect(isoDate(days[0])).toBe("2026-09-12"); // o próprio sábado
    expect(isoDate(days[1])).toBe("2026-09-14"); // domingo continua fora
  });

  // Atender um dia só por semana é configuração legítima (consultório que abre
  // às terças). O laço precisa atravessar seis dias fechados para achar cada um.
  it("acha os dias mesmo quando a clínica abre uma vez por semana", () => {
    const days = nextBookableDays({ year: 2026, month: 9, day: 12 }, 3, [2]);

    expect(days.map(isoDate)).toEqual(["2026-09-15", "2026-09-22", "2026-09-29"]);
  });

  // Sem esta guarda o laço procuraria para sempre um dia que não existe.
  it("devolve lista vazia — e não trava — se a clínica não atende dia nenhum", () => {
    expect(nextBookableDays({ year: 2026, month: 9, day: 12 }, 6, [])).toEqual([]);
  });
});
