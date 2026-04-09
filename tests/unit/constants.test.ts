import { describe, it, expect } from "vitest";
import {
  AREAS,
  FORMATS,
  MAINTEMODES,
  ASSORTMENTS,
  MAINTEMODE_COLORS,
  getAreaName,
  getFormatName,
  getMaintemodeName,
  getAssortmentName,
} from "@/lib/constants";

describe("AREAS", () => {
  it("should have 10 areas", () => {
    expect(Object.keys(AREAS)).toHaveLength(10);
  });

  it("should map code 1 to 北海道", () => {
    expect(AREAS["1"]).toBe("北海道");
  });

  it("should map code 10 to 沖縄", () => {
    expect(AREAS["10"]).toBe("沖縄");
  });
});

describe("FORMATS", () => {
  it("should have 9 formats", () => {
    expect(Object.keys(FORMATS)).toHaveLength(9);
  });

  it("should map code 1 to 原子力", () => {
    expect(FORMATS["1"]).toBe("原子力");
  });

  it("should map code 99 to その他", () => {
    expect(FORMATS["99"]).toBe("その他");
  });
});

describe("MAINTEMODES", () => {
  it("should have 3 modes", () => {
    expect(Object.keys(MAINTEMODES)).toHaveLength(3);
  });

  it("should map code 2 to 計画外停止", () => {
    expect(MAINTEMODES["2"]).toBe("計画外停止");
  });
});

describe("ASSORTMENTS", () => {
  it("should have 10 assortments", () => {
    expect(Object.keys(ASSORTMENTS)).toHaveLength(10);
  });

  it("should map code 1 to 停止・定期検査等", () => {
    expect(ASSORTMENTS["1"]).toBe("停止・定期検査等");
  });

  it("should map code 10 to 低下・その他", () => {
    expect(ASSORTMENTS["10"]).toBe("低下・その他");
  });
});

describe("getAreaName", () => {
  it("should return name for valid code", () => {
    expect(getAreaName("1")).toBe("北海道");
    expect(getAreaName("9")).toBe("九州");
  });

  it("should return 不明 for unknown code", () => {
    expect(getAreaName("99")).toBe("不明");
    expect(getAreaName("")).toBe("不明");
  });
});

describe("getFormatName", () => {
  it("should return name for valid code", () => {
    expect(getFormatName("3")).toBe("火力(ガス)");
  });

  it("should return 不明 for unknown code", () => {
    expect(getFormatName("100")).toBe("不明");
  });
});

describe("getMaintemodeName", () => {
  it("should return name for valid code", () => {
    expect(getMaintemodeName("1")).toBe("計画停止");
  });

  it("should return 不明 for unknown code", () => {
    expect(getMaintemodeName("0")).toBe("不明");
  });
});

describe("MAINTEMODE_COLORS", () => {
  it("should have a color for each maintemode", () => {
    for (const code of Object.keys(MAINTEMODES)) {
      expect(MAINTEMODE_COLORS[code]).toBeDefined();
      expect(MAINTEMODE_COLORS[code]).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it("should map code 1 (計画停止) to blue", () => {
    expect(MAINTEMODE_COLORS["1"]).toBe("#3b82f6");
  });

  it("should map code 2 (計画外停止) to red", () => {
    expect(MAINTEMODE_COLORS["2"]).toBe("#ef4444");
  });

  it("should map code 3 (出力低下) to amber", () => {
    expect(MAINTEMODE_COLORS["3"]).toBe("#f59e0b");
  });
});

describe("getAssortmentName", () => {
  it("should return name for valid code", () => {
    expect(getAssortmentName("7")).toBe("低下・設備故障");
  });

  it("should return 不明 for unknown code", () => {
    expect(getAssortmentName("999")).toBe("不明");
  });
});
