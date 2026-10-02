import { describe, it, expect } from "vitest";
import {
  parseOutageDate,
  parseOutageDateAsJST,
  formatDuration,
  formatShortDate,
  formatGeneratedAt,
  isSentinelDate,
  formatOutageDateLabel,
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

describe("isSentinelDate", () => {
  it("should treat 9999/xx/xx as sentinel", () => {
    expect(isSentinelDate("9999/12/31")).toBe(true);
    expect(isSentinelDate("9999/01/01 00:00")).toBe(true);
  });

  it("should treat other far-future placeholder years as sentinel", () => {
    expect(isSentinelDate("9998/11/03 09:00")).toBe(true);
    expect(isSentinelDate("2999/12/31 00:00")).toBe(true);
    expect(isSentinelDate("2200/08/01 08:30")).toBe(true);
  });

  it("should not treat real dates as sentinel", () => {
    expect(isSentinelDate("2026/10/02 13:00")).toBe(false);
    expect(isSentinelDate("2030/01/01")).toBe(false);
  });

  it("should return false for null/undefined/empty", () => {
    expect(isSentinelDate(null)).toBe(false);
    expect(isSentinelDate(undefined)).toBe(false);
    expect(isSentinelDate("")).toBe(false);
  });
});

describe("formatOutageDateLabel", () => {
  it("should replace sentinel dates with 未定", () => {
    expect(formatOutageDateLabel("9999/12/31 00:00")).toBe("未定");
    expect(formatOutageDateLabel("9998/11/03")).toBe("未定");
  });

  it("should keep real dates as-is", () => {
    expect(formatOutageDateLabel("2026/10/02 13:00")).toBe("2026/10/02 13:00");
  });

  it("should return null for missing values", () => {
    expect(formatOutageDateLabel(null)).toBeNull();
    expect(formatOutageDateLabel(undefined)).toBeNull();
  });
});

describe("formatGeneratedAt", () => {
  it("should format an ISO timestamp in Japanese without redundant suffix", () => {
    expect(formatGeneratedAt("2026-10-02T04:45:49.040Z")).toContain("2026年");
    expect(formatGeneratedAt("2026-10-02T04:45:49.040Z")).not.toContain("現在");
  });

  it("should return the original string when parsing fails", () => {
    expect(formatGeneratedAt("not-a-date")).toBe("not-a-date");
  });
});
