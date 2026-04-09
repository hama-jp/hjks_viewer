import { describe, it, expect } from "vitest";
import { applyFilters, applySort, parseSet } from "@/lib/filter-utils";
import type { NormalizedOutage } from "@/types/outage";
import type { Filters } from "@/components/filters/useFilters";

// --- Test fixtures ---

function makeRecord(overrides: Partial<NormalizedOutage> = {}): NormalizedOutage {
  return {
    id: "test-001",
    area: "1",
    areaName: "北海道",
    company: "北海道電力",
    plantcd: "01001",
    name: "泊発電所",
    format: "1",
    formatName: "原子力",
    unitname: "1号機",
    maxcapacity: 579000,
    downcapacity: 579000,
    maintemode: "1",
    maintemodeName: "計画停止",
    assortment: "1",
    assortmentName: "停止・定期検査等",
    startdt: "2026/03/01 00:00",
    restartschdt: null,
    outlook: "未定",
    factor: "定期検査",
    upddt: "2026/03/01 10:00",
    fetchedAt: "2026-04-05T06:00:00Z",
    ...overrides,
  };
}

const emptyFilters: Filters = {
  areas: new Set(),
  formats: new Set(),
  maintemodes: new Set(),
  searchText: "",
  dateFrom: "",
  dateTo: "",
};

const records: NormalizedOutage[] = [
  makeRecord({ id: "r1", area: "1", areaName: "北海道", format: "1", maintemode: "1", startdt: "2026/01/15 00:00", maxcapacity: 579000 }),
  makeRecord({ id: "r2", area: "3", areaName: "東京", company: "JERA", format: "3", formatName: "火力(ガス)", maintemode: "2", maintemodeName: "計画外停止", startdt: "2026/03/28 14:30", maxcapacity: 650000, factor: "ボイラー管漏洩" }),
  makeRecord({ id: "r3", area: "6", areaName: "関西", format: "1", maintemode: "1", startdt: "2026/02/15 00:00", maxcapacity: 826000 }),
  makeRecord({ id: "r4", area: "4", areaName: "中部", format: "2", formatName: "火力(石炭)", maintemode: "3", maintemodeName: "出力低下", startdt: "2026/04/02 06:00", maxcapacity: 700000, factor: "排煙脱硫装置不具合" }),
];

// --- parseSet ---

describe("parseSet", () => {
  it("should parse comma-separated string into a Set", () => {
    expect(parseSet("1,2,3")).toEqual(new Set(["1", "2", "3"]));
  });

  it("should return empty Set for null", () => {
    expect(parseSet(null)).toEqual(new Set());
  });

  it("should return empty Set for empty string", () => {
    expect(parseSet("")).toEqual(new Set());
  });

  it("should filter out empty strings from trailing commas", () => {
    expect(parseSet("1,,3,")).toEqual(new Set(["1", "3"]));
  });

  it("should handle single value", () => {
    expect(parseSet("5")).toEqual(new Set(["5"]));
  });
});

// --- applyFilters ---

describe("applyFilters", () => {
  it("should return all records with empty filters", () => {
    const result = applyFilters(records, emptyFilters);
    expect(result).toHaveLength(4);
  });

  it("should filter by area", () => {
    const result = applyFilters(records, { ...emptyFilters, areas: new Set(["1"]) });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("r1");
  });

  it("should filter by multiple areas", () => {
    const result = applyFilters(records, { ...emptyFilters, areas: new Set(["1", "6"]) });
    expect(result).toHaveLength(2);
  });

  it("should filter by format", () => {
    const result = applyFilters(records, { ...emptyFilters, formats: new Set(["3"]) });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("r2");
  });

  it("should filter by maintemode", () => {
    const result = applyFilters(records, { ...emptyFilters, maintemodes: new Set(["2"]) });
    expect(result).toHaveLength(1);
    expect(result[0].maintemodeName).toBe("計画外停止");
  });

  it("should filter by search text (company name)", () => {
    const result = applyFilters(records, { ...emptyFilters, searchText: "JERA" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("r2");
  });

  it("should filter by search text (factor)", () => {
    const result = applyFilters(records, { ...emptyFilters, searchText: "ボイラー" });
    expect(result).toHaveLength(1);
  });

  it("should filter by search text case-insensitively", () => {
    const result = applyFilters(records, { ...emptyFilters, searchText: "jera" });
    expect(result).toHaveLength(1);
  });

  it("should filter by dateFrom", () => {
    const result = applyFilters(records, { ...emptyFilters, dateFrom: "2026-03-01" });
    expect(result).toHaveLength(2); // r2 (03/28) and r4 (04/02)
  });

  it("should filter by dateTo", () => {
    const result = applyFilters(records, { ...emptyFilters, dateTo: "2026-02-28" });
    expect(result).toHaveLength(2); // r1 (01/15) and r3 (02/15)
  });

  it("should filter by date range", () => {
    const result = applyFilters(records, {
      ...emptyFilters,
      dateFrom: "2026-02-01",
      dateTo: "2026-03-31",
    });
    expect(result).toHaveLength(2); // r3 (02/15) and r2 (03/28)
  });

  it("should combine multiple filters (AND logic)", () => {
    const result = applyFilters(records, {
      ...emptyFilters,
      maintemodes: new Set(["1"]),
      areas: new Set(["1"]),
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("r1");
  });

  it("should return empty array when no records match", () => {
    const result = applyFilters(records, { ...emptyFilters, areas: new Set(["99"]) });
    expect(result).toHaveLength(0);
  });
});

// --- applySort ---

describe("applySort", () => {
  it("should sort by startdt descending (default)", () => {
    const result = applySort(records, "startdt", "desc");
    expect(result[0].id).toBe("r4"); // 2026/04/02
    expect(result[3].id).toBe("r1"); // 2026/01/15
  });

  it("should sort by startdt ascending", () => {
    const result = applySort(records, "startdt", "asc");
    expect(result[0].id).toBe("r1"); // 2026/01/15
    expect(result[3].id).toBe("r4"); // 2026/04/02
  });

  it("should sort by maxcapacity descending (numeric)", () => {
    const result = applySort(records, "maxcapacity", "desc");
    expect(result[0].maxcapacity).toBe(826000);
    expect(result[3].maxcapacity).toBe(579000);
  });

  it("should sort by areaName ascending (string, consistent order)", () => {
    const result = applySort(records, "areaName", "asc");
    // Verify sorted order is consistent (actual order depends on locale)
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].areaName.localeCompare(result[i].areaName)).toBeLessThanOrEqual(0);
    }
  });

  it("should not mutate original array", () => {
    const original = [...records];
    applySort(records, "startdt", "asc");
    expect(records.map((r) => r.id)).toEqual(original.map((r) => r.id));
  });
});
