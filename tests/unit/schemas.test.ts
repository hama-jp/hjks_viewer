import { describe, it, expect } from "vitest";
import {
  RawOutageRecordSchema,
  RawUnitRecordSchema,
  NormalizedOutageSchema,
  NormalizedUnitSchema,
  OutageFileSchema,
  DataManifestSchema,
} from "@/lib/schemas";

// --- RawOutageRecordSchema ---

describe("RawOutageRecordSchema", () => {
  const validRaw = {
    area: "1",
    company: "北海道電力",
    plantcd: "01001",
    name: "泊発電所",
    format: "1",
    unitname: "1号機",
    maxcapacity: "579000",
    maintemode: "1",
    assortment: "1",
    downcapacity: "579000",
    startdt: "2024/05/01 00:00",
    outlook: "未定",
    restartschdt: "",
    factor: "定期検査",
    upddt: "2024/05/01 10:00",
  };

  it("should accept a valid raw outage record", () => {
    const result = RawOutageRecordSchema.safeParse(validRaw);
    expect(result.success).toBe(true);
  });

  it("should reject record with missing fields", () => {
    const { area: _area, ...incomplete } = validRaw;
    const result = RawOutageRecordSchema.safeParse(incomplete);
    expect(result.success).toBe(false);
  });

  it("should reject record with non-string field", () => {
    const result = RawOutageRecordSchema.safeParse({
      ...validRaw,
      maxcapacity: 579000, // number instead of string
    });
    expect(result.success).toBe(false);
  });

  it("should accept empty strings (CSV often has blanks)", () => {
    const result = RawOutageRecordSchema.safeParse({
      ...validRaw,
      restartschdt: "",
      outlook: "",
      factor: "",
    });
    expect(result.success).toBe(true);
  });
});

// --- RawUnitRecordSchema ---

describe("RawUnitRecordSchema", () => {
  const validRawUnit = {
    area: "3",
    company: "東京電力",
    plantcd: "03010",
    name: "柏崎刈羽原子力発電所",
    format: "1",
    unitname: "1号機",
    maxcapacity: "1100000",
    nextmaxcapacity: "",
    nextmaxcapacitystartdt: "",
    startdt: "1985/09/18",
    enddt: "",
    upddt: "2024/01/15 09:00",
  };

  it("should accept a valid raw unit record", () => {
    const result = RawUnitRecordSchema.safeParse(validRawUnit);
    expect(result.success).toBe(true);
  });

  it("should reject record with missing fields", () => {
    const { unitname: _unitname, ...incomplete } = validRawUnit;
    const result = RawUnitRecordSchema.safeParse(incomplete);
    expect(result.success).toBe(false);
  });
});

// --- NormalizedOutageSchema ---

describe("NormalizedOutageSchema", () => {
  const validNormalized = {
    id: "abc123",
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
    startdt: "2024-05-01T00:00:00+09:00",
    restartschdt: null,
    outlook: "未定",
    factor: "定期検査",
    upddt: "2024-05-01T10:00:00+09:00",
    fetchedAt: "2024-05-02T06:00:00Z",
  };

  it("should accept a valid normalized outage", () => {
    const result = NormalizedOutageSchema.safeParse(validNormalized);
    expect(result.success).toBe(true);
  });

  it("should accept null restartschdt", () => {
    const result = NormalizedOutageSchema.safeParse({
      ...validNormalized,
      restartschdt: null,
    });
    expect(result.success).toBe(true);
  });

  it("should accept string restartschdt", () => {
    const result = NormalizedOutageSchema.safeParse({
      ...validNormalized,
      restartschdt: "2025-01-01T00:00:00+09:00",
    });
    expect(result.success).toBe(true);
  });

  it("should reject string maxcapacity (must be number)", () => {
    const result = NormalizedOutageSchema.safeParse({
      ...validNormalized,
      maxcapacity: "579000",
    });
    expect(result.success).toBe(false);
  });

  it("should reject missing id", () => {
    const { id: _id, ...noId } = validNormalized;
    const result = NormalizedOutageSchema.safeParse(noId);
    expect(result.success).toBe(false);
  });
});

// --- NormalizedUnitSchema ---

describe("NormalizedUnitSchema", () => {
  const validUnit = {
    id: "unit001",
    area: "3",
    areaName: "東京",
    company: "東京電力",
    plantcd: "03010",
    name: "柏崎刈羽原子力発電所",
    format: "1",
    formatName: "原子力",
    unitname: "1号機",
    maxcapacity: 1100000,
    nextmaxcapacity: null,
    nextmaxcapacitystartdt: null,
    startdt: "1985-09-18",
    enddt: null,
    upddt: "2024-01-15T09:00:00+09:00",
  };

  it("should accept a valid normalized unit", () => {
    const result = NormalizedUnitSchema.safeParse(validUnit);
    expect(result.success).toBe(true);
  });

  it("should accept null for optional date fields", () => {
    const result = NormalizedUnitSchema.safeParse({
      ...validUnit,
      startdt: null,
      enddt: null,
      nextmaxcapacity: null,
      nextmaxcapacitystartdt: null,
    });
    expect(result.success).toBe(true);
  });
});

// --- OutageFileSchema ---

describe("OutageFileSchema", () => {
  it("should accept a valid outage file structure", () => {
    const file = {
      meta: {
        generatedAt: "2024-05-02T06:00:00Z",
        recordCount: 1,
        source: "csv" as const,
      },
      records: [
        {
          id: "abc123",
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
          startdt: "2024-05-01T00:00:00+09:00",
          restartschdt: null,
          outlook: "未定",
          factor: "定期検査",
          upddt: "2024-05-01T10:00:00+09:00",
          fetchedAt: "2024-05-02T06:00:00Z",
        },
      ],
    };
    const result = OutageFileSchema.safeParse(file);
    expect(result.success).toBe(true);
  });

  it("should reject invalid source type", () => {
    const file = {
      meta: {
        generatedAt: "2024-05-02T06:00:00Z",
        recordCount: 0,
        source: "invalid",
      },
      records: [],
    };
    const result = OutageFileSchema.safeParse(file);
    expect(result.success).toBe(false);
  });
});

// --- DataManifestSchema ---

describe("DataManifestSchema", () => {
  it("should accept a valid manifest", () => {
    const manifest = {
      lastUpdated: "2024-05-02T06:00:00Z",
      files: {
        current: {
          path: "outages-current.json",
          recordCount: 245,
          sizeBytes: 189000,
        },
        archives: [
          {
            path: "outages-archive/2024-Q1.json",
            period: "2024-Q1",
            recordCount: 1200,
          },
        ],
        units: {
          path: "units.json",
          recordCount: 850,
        },
      },
    };
    const result = DataManifestSchema.safeParse(manifest);
    expect(result.success).toBe(true);
  });

  it("should accept empty archives array", () => {
    const manifest = {
      lastUpdated: "2024-05-02T06:00:00Z",
      files: {
        current: { path: "outages-current.json", recordCount: 0, sizeBytes: 0 },
        archives: [],
        units: { path: "units.json", recordCount: 0 },
      },
    };
    const result = DataManifestSchema.safeParse(manifest);
    expect(result.success).toBe(true);
  });
});
