import {
  atendeNoDia,
  DIAS_PADRAO,
  EXPEDIENTE_PADRAO,
  getWorkingSlots,
  horaParaMinutos,
  isoDate,
  minutosParaHora,
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

  // O expediente virou configuração; os padrões precisam continuar produzindo
  // exatamente a grade de antes, senão a mudança mexeria em clínica que não
  // pediu nada.
  it("o expediente padrão é o mesmo 08–12 / 13–18 de 40min", () => {
    expect(EXPEDIENTE_PADRAO).toEqual({
      morningStartMinutes: 480,
      morningEndMinutes: 720,
      afternoonStartMinutes: 780,
      afternoonEndMinutes: 1080,
      slotDurationMinutes: 40,
    });
    expect(getWorkingSlots(EXPEDIENTE_PADRAO)).toEqual(getWorkingSlots());
  });

  it("converte entre minutos e HH:mm nos dois sentidos", () => {
    expect(minutosParaHora(0)).toBe("00:00");
    expect(minutosParaHora(480)).toBe("08:00");
    expect(minutosParaHora(1439)).toBe("23:59");
    expect(horaParaMinutos("08:00")).toBe(480);
    expect(horaParaMinutos("13:30")).toBe(810);
  });

  it("segue o expediente configurado pela clínica", () => {
    const configurado = {
      morningStartMinutes: horaParaMinutos("09:00"),
      morningEndMinutes: horaParaMinutos("12:00"),
      afternoonStartMinutes: horaParaMinutos("14:00"),
      afternoonEndMinutes: horaParaMinutos("16:00"),
      slotDurationMinutes: 30,
    };

    expect(getWorkingSlots(configurado)).toEqual([
      "09:00",
      "09:30",
      "10:00",
      "10:30",
      "11:00",
      "11:30",
      "14:00",
      "14:30",
      "15:00",
      "15:30",
    ]);
  });

  // Turno único é caso real: consultório que só abre de manhã. A API guarda o
  // turno desligado como janela de tamanho zero.
  it("clínica de um turno só gera horários do turno que existe", () => {
    const soManha = {
      morningStartMinutes: horaParaMinutos("08:00"),
      morningEndMinutes: horaParaMinutos("11:00"),
      afternoonStartMinutes: horaParaMinutos("11:00"),
      afternoonEndMinutes: horaParaMinutos("11:00"), // tarde desligada
      slotDurationMinutes: 60,
    };
    expect(getWorkingSlots(soManha)).toEqual(["08:00", "09:00", "10:00"]);

    const soTarde = {
      morningStartMinutes: horaParaMinutos("14:00"),
      morningEndMinutes: horaParaMinutos("14:00"), // manhã desligada
      afternoonStartMinutes: horaParaMinutos("14:00"),
      afternoonEndMinutes: horaParaMinutos("17:00"),
      slotDurationMinutes: 60,
    };
    expect(getWorkingSlots(soTarde)).toEqual(["14:00", "15:00", "16:00"]);
  });

  // Sem almoço é configuração válida e salvável: a tarde começa na hora em que
  // a manhã termina, e a grade sai contínua.
  it("expediente contínuo, sem parada para o almoço", () => {
    const semAlmoco = {
      morningStartMinutes: horaParaMinutos("08:00"),
      morningEndMinutes: horaParaMinutos("12:00"),
      afternoonStartMinutes: horaParaMinutos("12:00"),
      afternoonEndMinutes: horaParaMinutos("13:00"),
      slotDurationMinutes: 60,
    };

    expect(getWorkingSlots(semAlmoco)).toEqual(["08:00", "09:00", "10:00", "11:00", "12:00"]);
  });

  it("janela invertida ou duração inválida não gera horário, em vez de travar", () => {
    const invertido = { ...EXPEDIENTE_PADRAO, morningStartMinutes: 720, morningEndMinutes: 480 };
    expect(getWorkingSlots(invertido).every((h) => h >= "13:00")).toBe(true);

    expect(getWorkingSlots({ ...EXPEDIENTE_PADRAO, slotDurationMinutes: 0 })).toEqual([]);
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
