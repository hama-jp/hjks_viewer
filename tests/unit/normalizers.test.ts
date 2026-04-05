import { describe, it, expect } from "vitest";
import {
  normalizeOutages,
  normalizeUnits,
  deduplicateOutages,
} from "../../scripts/lib/normalizers";
import { NormalizedOutageSchema, NormalizedUnitSchema } from "@/lib/schemas";
import type { RawOutageRecord, RawUnitRecord } from "@/types/outage";

// --- Test fixtures ---

const RAW_OUTAGE: RawOutageRecord = {
  area: "北海道",
  company: "北海道電力",
  plantcd: "01001",
  name: "泊発電所",
  format: "原子力",
  unitname: "1号機",
  maxcapacity: "579000",
  maintemode: "計画停止",
  assortment: "停止・定期検査等",
  downcapacity: "579000",
  startdt: "2024/05/01 00:00",
  outlook: "未定",
  restartschdt: "",
  factor: "定期検査",
  upddt: "2024/05/01 10:00",
};

const RAW_OUTAGE_2: RawOutageRecord = {
  area: "東京",
  company: "東京電力",
  plantcd: "03010",
  name: "品川火力発電所",
  format: "火力(ガス)",
  unitname: "1号機",
  maxcapacity: "1140000",
  maintemode: "計画外停止",
  assortment: "停止・設備故障",
  downcapacity: "1140000",
  startdt: "2024/06/15 08:30",
  outlook: "2024年7月上旬",
  restartschdt: "2024/07/01 00:00",
  factor: "ボイラー不具合",
  upddt: "2024/06/15 12:00",
};

const RAW_UNIT: RawUnitRecord = {
  area: "北海道",
  company: "北海道電力",
  plantcd: "01001",
  name: "泊発電所",
  format: "原子力",
  unitname: "1号機",
  maxcapacity: "579000",
  nextmaxcapacity: "",
  nextmaxcapacitystartdt: "",
  startdt: "1989/06/22",
  enddt: "",
  upddt: "2024/01/10 09:00",
};

// --- normalizeOutages ---

describe("normalizeOutages", () => {
  it("should normalize a single raw outage record", () => {
    const results = normalizeOutages([RAW_OUTAGE], "2024-05-02T06:00:00Z");
    expect(results).toHaveLength(1);

    const r = results[0];
    // All fields should exist and validate against schema
    const validation = NormalizedOutageSchema.safeParse(r);
    expect(validation.success).toBe(true);
  });

  it("should generate a deterministic id from plantcd + unitname + startdt", () => {
    const results1 = normalizeOutages([RAW_OUTAGE]);
    const results2 = normalizeOutages([RAW_OUTAGE]);
    expect(results1[0].id).toBe(results2[0].id);
    expect(results1[0].id).toBeTruthy();
  });

  it("should convert maxcapacity and downcapacity to numbers", () => {
    const results = normalizeOutages([RAW_OUTAGE]);
    expect(results[0].maxcapacity).toBe(579000);
    expect(results[0].downcapacity).toBe(579000);
    expect(typeof results[0].maxcapacity).toBe("number");
  });

  it("should resolve area name from Japanese display name", () => {
    const results = normalizeOutages([RAW_OUTAGE]);
    expect(results[0].area).toMatch(/^\d+$/); // Should be a code
    expect(results[0].areaName).toBe("北海道");
  });

  it("should resolve format name from Japanese display name", () => {
    const results = normalizeOutages([RAW_OUTAGE]);
    expect(results[0].format).toMatch(/^\d+$/);
    expect(results[0].formatName).toBe("原子力");
  });

  it("should resolve maintemode name", () => {
    const results = normalizeOutages([RAW_OUTAGE]);
    expect(results[0].maintemode).toMatch(/^\d+$/);
    expect(results[0].maintemodeName).toBe("計画停止");
  });

  it("should resolve assortment name", () => {
    const results = normalizeOutages([RAW_OUTAGE]);
    expect(results[0].assortment).toMatch(/^\d+$/);
    expect(results[0].assortmentName).toBe("停止・定期検査等");
  });

  it("should set restartschdt to null when empty", () => {
    const results = normalizeOutages([RAW_OUTAGE]);
    expect(results[0].restartschdt).toBeNull();
  });

  it("should keep restartschdt as string when present", () => {
    const results = normalizeOutages([RAW_OUTAGE_2]);
    expect(results[0].restartschdt).toBeTruthy();
    expect(typeof results[0].restartschdt).toBe("string");
  });

  it("should set fetchedAt", () => {
    const ts = "2024-05-02T06:00:00Z";
    const results = normalizeOutages([RAW_OUTAGE], ts);
    expect(results[0].fetchedAt).toBe(ts);
  });

  it("should use current time as fetchedAt when not provided", () => {
    const before = new Date().toISOString();
    const results = normalizeOutages([RAW_OUTAGE]);
    const after = new Date().toISOString();
    expect(results[0].fetchedAt >= before).toBe(true);
    expect(results[0].fetchedAt <= after).toBe(true);
  });

  it("should normalize multiple records", () => {
    const results = normalizeOutages([RAW_OUTAGE, RAW_OUTAGE_2]);
    expect(results).toHaveLength(2);
    expect(results[0].id).not.toBe(results[1].id);
  });

  it("should skip records that fail validation and return valid ones", () => {
    const badRecord = { ...RAW_OUTAGE, maxcapacity: "not-a-number" };
    const results = normalizeOutages([badRecord, RAW_OUTAGE_2]);
    // Should still return the valid record
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  it("should return empty array for empty input", () => {
    const results = normalizeOutages([]);
    expect(results).toHaveLength(0);
  });

  it("should normalize record with full-width parentheses in format", () => {
    const raw = {
      ...RAW_OUTAGE,
      format: "火力（石炭）",
      maxcapacity: "500,000",
      downcapacity: "123,000",
    };
    const results = normalizeOutages([raw]);
    expect(results).toHaveLength(1);
    expect(results[0].formatName).toBe("火力(石炭)");
    expect(results[0].maxcapacity).toBe(500000);
    expect(results[0].downcapacity).toBe(123000);
  });

  it("should normalize full-width digits in numeric fields", () => {
    const raw = {
      ...RAW_OUTAGE,
      maxcapacity: "５７９０００",
      downcapacity: "５７９０００",
    };
    const results = normalizeOutages([raw]);
    expect(results).toHaveLength(1);
    expect(results[0].maxcapacity).toBe(579000);
  });

  it("should normalize newlines in factor field", () => {
    const raw = {
      ...RAW_OUTAGE,
      factor: "確認試験\n最大低下量：350,000kW\n最小低下量：0kW",
    };
    const results = normalizeOutages([raw]);
    expect(results).toHaveLength(1);
    expect(results[0].factor).toBe(
      "確認試験 / 最大低下量：350,000kW / 最小低下量：0kW"
    );
  });
});

// --- normalizeUnits ---

describe("normalizeUnits", () => {
  it("should normalize a single raw unit record", () => {
    const results = normalizeUnits([RAW_UNIT]);
    expect(results).toHaveLength(1);

    const validation = NormalizedUnitSchema.safeParse(results[0]);
    expect(validation.success).toBe(true);
  });

  it("should convert maxcapacity to number", () => {
    const results = normalizeUnits([RAW_UNIT]);
    expect(results[0].maxcapacity).toBe(579000);
  });

  it("should set nextmaxcapacity to null when empty", () => {
    const results = normalizeUnits([RAW_UNIT]);
    expect(results[0].nextmaxcapacity).toBeNull();
  });

  it("should set enddt to null when empty", () => {
    const results = normalizeUnits([RAW_UNIT]);
    expect(results[0].enddt).toBeNull();
  });

  it("should resolve area and format names", () => {
    const results = normalizeUnits([RAW_UNIT]);
    expect(results[0].areaName).toBe("北海道");
    expect(results[0].formatName).toBe("原子力");
  });

  it("should return empty array for empty input", () => {
    expect(normalizeUnits([])).toHaveLength(0);
  });
});

// --- deduplicateOutages ---

describe("deduplicateOutages", () => {
  it("should merge without duplicates", () => {
    const norm1 = normalizeOutages([RAW_OUTAGE]);
    const norm2 = normalizeOutages([RAW_OUTAGE_2]);
    const merged = deduplicateOutages(norm1, norm2);
    expect(merged).toHaveLength(2);
  });

  it("should remove duplicates (same id)", () => {
    const norm = normalizeOutages([RAW_OUTAGE]);
    const merged = deduplicateOutages(norm, norm);
    expect(merged).toHaveLength(1);
  });

  it("should prefer incoming records over existing (updated data)", () => {
    const existing = normalizeOutages([RAW_OUTAGE], "2024-05-01T00:00:00Z");
    const incoming = normalizeOutages([RAW_OUTAGE], "2024-05-02T00:00:00Z");
    const merged = deduplicateOutages(existing, incoming);
    expect(merged).toHaveLength(1);
    expect(merged[0].fetchedAt).toBe("2024-05-02T00:00:00Z");
  });

  it("should handle empty existing", () => {
    const incoming = normalizeOutages([RAW_OUTAGE]);
    const merged = deduplicateOutages([], incoming);
    expect(merged).toHaveLength(1);
  });

  it("should handle empty incoming", () => {
    const existing = normalizeOutages([RAW_OUTAGE]);
    const merged = deduplicateOutages(existing, []);
    expect(merged).toHaveLength(1);
  });
});
