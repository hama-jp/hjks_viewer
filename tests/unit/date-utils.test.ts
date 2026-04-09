import { describe, it, expect } from "vitest";
import { parseOutageDate, formatDuration } from "@/lib/date-utils";

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
