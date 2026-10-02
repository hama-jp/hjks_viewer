import { describe, it, expect } from "vitest";
import {
  parseOutageDate,
  parseOutageDateAsJST,
  formatDuration,
  formatShortDate,
  isUndeterminedDate,
  formatOutageDateLabel,
  formatGeneratedAt,
} from "@/lib/date-utils";

describe("parseOutageDate", () => {
  it("parses date with time", () => {
    const result = parseOutageDate("2024/03/15 10:30");
    expect(result).toBe(new Date(2024, 2, 15, 10, 30).getTime());
  });

  it("parses date without time", () => {
    const result = parseOutageDate("2024/03/15");
    expect(result).toBe(new Date(2024, 2, 15, 0, 0).getTime());
  });

  it("parses date with midnight time", () => {
    const result = parseOutageDate("2024/01/01 00:00");
    expect(result).toBe(new Date(2024, 0, 1, 0, 0).getTime());
  });

  it("parses single-digit month and day", () => {
    const result = parseOutageDate("2024/1/5 9:00");
    expect(result).toBe(new Date(2024, 0, 5, 9, 0).getTime());
  });

  it("returns NaN for empty string", () => {
    expect(parseOutageDate("")).toBeNaN();
  });

  it("returns NaN for invalid date string", () => {
    expect(parseOutageDate("invalid")).toBeNaN();
  });
});

describe("parseOutageDateAsJST", () => {
  it("parses YYYY/MM/DD HH:mm as JST", () => {
    const result = parseOutageDateAsJST("2024/03/15 10:30");
    // 10:30 JST = 01:30 UTC
    expect(result.toISOString()).toBe("2024-03-15T01:30:00.000Z");
  });

  it("parses date without time as JST midnight", () => {
    const result = parseOutageDateAsJST("2024/03/15");
    // 00:00 JST = previous day 15:00 UTC
    expect(result.toISOString()).toBe("2024-03-14T15:00:00.000Z");
  });

  it("parses single-digit month and day", () => {
    const result = parseOutageDateAsJST("2024/1/5 9:00");
    // 09:00 JST = 00:00 UTC
    expect(result.toISOString()).toBe("2024-01-05T00:00:00.000Z");
  });

  it("parses ISO format", () => {
    const result = parseOutageDateAsJST("2024-03-15T10:30:00+09:00");
    expect(result.toISOString()).toBe("2024-03-15T01:30:00.000Z");
  });

  it("throws on invalid date string", () => {
    expect(() => parseOutageDateAsJST("invalid")).toThrow("Cannot parse outage date");
  });
});

describe("formatDuration", () => {
  it("should format duration in days and hours", () => {
    const start = new Date(2026, 0, 1, 0, 0).getTime();
    const end = new Date(2026, 0, 3, 12, 0).getTime(); // 2日12時間後
    expect(formatDuration(start, end)).toBe("2日12時間");
  });

  it("should return 0日0時間 for negative duration", () => {
    const start = new Date(2026, 0, 5).getTime();
    const end = new Date(2026, 0, 1).getTime();
    expect(formatDuration(start, end)).toBe("0日0時間");
  });

  it("should return 0日0時間 for zero duration", () => {
    const t = new Date(2026, 0, 1).getTime();
    expect(formatDuration(t, t)).toBe("0日0時間");
  });

  it("should handle hours-only duration", () => {
    const start = new Date(2026, 0, 1, 0, 0).getTime();
    const end = new Date(2026, 0, 1, 5, 0).getTime();
    expect(formatDuration(start, end)).toBe("0日5時間");
  });

  it("should handle large durations", () => {
    const start = new Date(2026, 0, 1).getTime();
    const end = new Date(2026, 3, 11).getTime(); // 100 days later
    expect(formatDuration(start, end)).toBe("100日0時間");
  });
});

describe("isUndeterminedDate", () => {
  it("detects the 9999 sentinel", () => {
    expect(isUndeterminedDate("9999/12/31 00:00")).toBe(true);
    expect(isUndeterminedDate("9999/04/03 09:00")).toBe(true);
  });

  it("returns false for normal dates and empty values", () => {
    expect(isUndeterminedDate("2026/01/01 00:00")).toBe(false);
    expect(isUndeterminedDate("")).toBe(false);
    expect(isUndeterminedDate(null)).toBe(false);
    expect(isUndeterminedDate(undefined)).toBe(false);
  });
});

describe("formatOutageDateLabel", () => {
  it("renders the undetermined sentinel as 未定", () => {
    expect(formatOutageDateLabel("9999/12/31 00:00")).toBe("未定");
  });

  it("returns the original string for normal dates", () => {
    expect(formatOutageDateLabel("2026/01/01 00:00")).toBe("2026/01/01 00:00");
  });

  it("renders empty values as a dash", () => {
    expect(formatOutageDateLabel("")).toBe("―");
    expect(formatOutageDateLabel(null)).toBe("―");
    expect(formatOutageDateLabel(undefined)).toBe("―");
  });
});

describe("formatGeneratedAt", () => {
  it("formats ISO as yyyy年M月d日 H:mm (local time)", () => {
    const d = new Date(2026, 9, 2, 13, 45);
    expect(formatGeneratedAt(d.toISOString())).toBe("2026年10月2日 13:45");
  });

  it("zero-pads minutes", () => {
    const d = new Date(2026, 0, 5, 9, 5);
    expect(formatGeneratedAt(d.toISOString())).toBe("2026年1月5日 9:05");
  });

  it("returns the original value when unparsable", () => {
    expect(formatGeneratedAt("invalid")).toBe("invalid");
  });
});

describe("formatShortDate", () => {
  it("should format as M/D without zero-padding", () => {
    expect(formatShortDate(new Date(2026, 0, 3).getTime())).toBe("1/3");
  });

  it("should format double-digit month and day", () => {
    expect(formatShortDate(new Date(2026, 11, 23).getTime())).toBe("12/23");
  });

  it("should format year-end date", () => {
    expect(formatShortDate(new Date(2026, 11, 31).getTime())).toBe("12/31");
  });

  it("should format date with time component", () => {
    expect(formatShortDate(new Date(2026, 2, 15, 10, 30).getTime())).toBe("3/15");
  });
});
