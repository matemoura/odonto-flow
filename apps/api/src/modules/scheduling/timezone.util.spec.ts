import {
  formatZonedIsoDate,
  formatZonedTime,
  getZonedParts,
  zonedDateOnlyToUtc,
  zonedDateTimeToUtc,
} from "./timezone.util";

describe("timezone.util", () => {
  it("converte um horário de parede em America/Sao_Paulo (UTC-3, sem DST) para o instante UTC certo", () => {
    const utc = zonedDateTimeToUtc("2026-09-10", "10:00", "America/Sao_Paulo");
    expect(utc.toISOString()).toBe("2026-09-10T13:00:00.000Z");
  });

  it("converte um horário de parede em UTC (sem offset) igual à hora informada", () => {
    const utc = zonedDateTimeToUtc("2026-09-10", "10:00", "UTC");
    expect(utc.toISOString()).toBe("2026-09-10T10:00:00.000Z");
  });

  it("é o inverso de getZonedParts para o mesmo fuso", () => {
    const utc = zonedDateTimeToUtc("2026-01-15", "14:30", "America/Sao_Paulo");
    const parts = getZonedParts(utc, "America/Sao_Paulo");
    expect(parts).toMatchObject({ year: 2026, month: 1, day: 15, hour: 14, minute: 30 });
  });

  it("formatZonedIsoDate/formatZonedTime refletem o fuso pedido, não o do servidor", () => {
    // 2026-09-10T02:00:00Z é ainda 09-09 (23:00) em America/Sao_Paulo (UTC-3)
    const utc = new Date("2026-09-10T02:00:00.000Z");
    expect(formatZonedIsoDate(utc, "America/Sao_Paulo")).toBe("2026-09-09");
    expect(formatZonedTime(utc, "America/Sao_Paulo")).toBe("23:00");
    expect(formatZonedIsoDate(utc, "UTC")).toBe("2026-09-10");
  });
});

describe("zonedDateOnlyToUtc", () => {
  // O bug que isto conserta: `new Date("2026-09-18")` é meia-noite UTC, que em
  // São Paulo é 21h do dia 17. A data voltava para a tela um dia atrás — o
  // dentista digitava 18 e lia 17.
  it("lê uma data sem hora como meia-noite NA CLÍNICA", () => {
    expect(zonedDateOnlyToUtc("2026-09-18", "America/Sao_Paulo").toISOString()).toBe(
      "2026-09-18T03:00:00.000Z",
    );
    expect(zonedDateOnlyToUtc("2026-09-18", "UTC").toISOString()).toBe("2026-09-18T00:00:00.000Z");
    expect(zonedDateOnlyToUtc("2026-09-18", "Asia/Tokyo").toISOString()).toBe(
      "2026-09-17T15:00:00.000Z",
    );
  });

  it("o dia de volta é o mesmo que foi digitado, em qualquer fuso", () => {
    for (const fuso of ["America/Sao_Paulo", "UTC", "Asia/Tokyo", "Pacific/Kiritimati"]) {
      expect(formatZonedIsoDate(zonedDateOnlyToUtc("2026-09-18", fuso), fuso)).toBe("2026-09-18");
    }
  });

  // `@IsDateString` aceita os dois formatos; quando o instante já vem
  // completo, o fuso está na própria string e não há o que adivinhar.
  it("respeita um instante completo em vez de reinterpretá-lo", () => {
    expect(zonedDateOnlyToUtc("2026-09-18T14:30:00.000Z", "America/Sao_Paulo").toISOString()).toBe(
      "2026-09-18T14:30:00.000Z",
    );
    expect(zonedDateOnlyToUtc("2026-09-18T14:30:00-03:00", "UTC").toISOString()).toBe(
      "2026-09-18T17:30:00.000Z",
    );
  });
});
