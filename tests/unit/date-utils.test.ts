import { describe, it, expect } from "vitest";
import { parseOutageDate } from "@/lib/date-utils";

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
