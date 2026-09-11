import { getWorkingSlots, isClosedDay, isSunday, isoDate, nextBookableDays, weekdayLabel } from "./availability.util";

describe("availability.util", () => {
  it("gera slots de 40min pulando o horário de almoço (12h-13h)", () => {
    const slots = getWorkingSlots();
    expect(slots[0]).toBe("08:00");
    expect(slots).not.toContain("12:00");
    expect(slots).not.toContain("12:20");
    expect(slots).toContain("13:00");
    expect(slots[slots.length - 1]).toBe("17:40");
  });

  it("identifica domingo (weekday 0) e sábado (weekday 6) corretamente", () => {
    expect(isSunday(0)).toBe(true);
    expect(isSunday(3)).toBe(false);
    expect(isClosedDay(6)).toBe(true);
    expect(isClosedDay(0)).toBe(false);
    expect(isClosedDay(3)).toBe(false);
  });

  it("nextBookableDays pula domingos e retorna a quantidade pedida, sem depender do fuso do servidor", () => {
    // 2026-09-12 é um sábado
    const days = nextBookableDays({ year: 2026, month: 9, day: 12 }, 6);

    expect(days).toHaveLength(6);
    expect(days.some((d) => isSunday(d.weekday))).toBe(false);
    expect(weekdayLabel(days[0])).toBe("sáb");
    expect(isoDate(days[0])).toBe("2026-09-12");
    // pulou o domingo 13 e foi direto para segunda 14
    expect(isoDate(days[1])).toBe("2026-09-14");
  });
});
