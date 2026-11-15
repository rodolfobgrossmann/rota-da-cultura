import { describe, expect, it } from "vitest";

import { dayMonth, formatPrice, fromDateTimeInputs, hourLabel, longDate, toDateInput, toTimeInput } from "@/lib/format";

describe("event dates use São Paulo time", () => {
  it("turns the form's 21/11/2026 20:00 into 23:00 UTC", () => {
    expect(fromDateTimeInputs("2026-11-21", "20:00")).toBe("2026-11-21T23:00:00.000Z");
  });

  it("shows that moment back as 20h on Sábado, 21 de novembro", () => {
    const iso = "2026-11-21T23:00:00.000Z";
    expect(hourLabel(iso)).toBe("20h");
    expect(dayMonth(iso)).toBe("21 nov");
    expect(longDate(iso)).toBe("Sábado, 21 de novembro");
  });

  it("fills the edit form with the same date and time that were saved", () => {
    const iso = fromDateTimeInputs("2026-12-05", "14:30");
    expect(toDateInput(iso)).toBe("2026-12-05");
    expect(toTimeInput(iso)).toBe("14:30");
  });

  it("formats ticket prices in reais", () => {
    expect(formatPrice(30).replace(/\s/g, " ")).toBe("R$ 30,00");
  });
});
