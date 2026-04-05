import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from "fs";
import { resolve } from "path";
import { getQuarter, archiveOutages } from "../../scripts/lib/archiver";
import type { OutageFile } from "@/types/outage";

// --- getQuarter ---

describe("getQuarter", () => {
  it("should return Q1 for January", () => {
    expect(getQuarter("2026/01/15 00:00")).toBe("2026-Q1");
  });

  it("should return Q1 for March", () => {
    expect(getQuarter("2026/03/31 23:59")).toBe("2026-Q1");
  });

  it("should return Q2 for April", () => {
    expect(getQuarter("2026/04/01 00:00")).toBe("2026-Q2");
  });

  it("should return Q2 for June", () => {
    expect(getQuarter("2026/06/30 23:59")).toBe("2026-Q2");
  });

  it("should return Q3 for July", () => {
    expect(getQuarter("2026/07/01 00:00")).toBe("2026-Q3");
  });

  it("should return Q4 for October", () => {
    expect(getQuarter("2026/10/15 12:00")).toBe("2026-Q4");
  });

  it("should return Q4 for December", () => {
    expect(getQuarter("2025/12/31 23:59")).toBe("2025-Q4");
  });

  it("should handle ISO date format", () => {
    expect(getQuarter("2026-04-05T06:00:00Z")).toBe("2026-Q2");
  });

  it("should handle ISO date without time", () => {
    expect(getQuarter("2026-01-15")).toBe("2026-Q1");
  });

  it("should throw for invalid date format", () => {
    expect(() => getQuarter("invalid")).toThrow("Cannot parse date");
  });
});

// --- archiveOutages (integration test with temp directory) ---

describe("archiveOutages", () => {
  const tmpDir = resolve(__dirname, "../../.test-tmp-archive");

  function makeOutageFile(records: OutageFile["records"]): OutageFile {
    return {
      meta: {
        generatedAt: "2026-04-05T06:00:00Z",
        recordCount: records.length,
        source: "csv",
      },
      records,
    };
  }

  function makeRecord(id: string, startdt: string, restartschdt: string | null) {
    return {
      id,
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
      startdt,
      restartschdt,
      outlook: "未定",
      factor: "定期検査",
      upddt: "2026/04/01 10:00",
      fetchedAt: "2026-04-05T06:00:00Z",
    };
  }

  beforeEach(() => {
    mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("should do nothing when outages-current.json does not exist", () => {
    archiveOutages(tmpDir);
    // No error, no files created
    expect(existsSync(resolve(tmpDir, "outages-archive"))).toBe(false);
  });

  it("should do nothing when no historical records exist", () => {
    const file = makeOutageFile([
      makeRecord("r1", "2026/03/01 00:00", null), // no restart → still current
    ]);
    writeFileSync(resolve(tmpDir, "outages-current.json"), JSON.stringify(file));

    archiveOutages(tmpDir);

    // No archive directory created
    expect(existsSync(resolve(tmpDir, "outages-archive"))).toBe(false);
    // Current file unchanged
    const current = JSON.parse(readFileSync(resolve(tmpDir, "outages-current.json"), "utf-8"));
    expect(current.records).toHaveLength(1);
  });

  it("should archive historical records and keep current ones", () => {
    const file = makeOutageFile([
      makeRecord("r1", "2026/03/01 00:00", null),              // current (no restart)
      makeRecord("r2", "2025/07/01 00:00", "2025/08/01 00:00"), // historical (restarted in past)
      makeRecord("r3", "2026/04/01 00:00", "2099/01/01 00:00"), // current (restart in future)
    ]);
    writeFileSync(resolve(tmpDir, "outages-current.json"), JSON.stringify(file));

    archiveOutages(tmpDir);

    // Current should have 2 records (r1 and r3)
    const current = JSON.parse(readFileSync(resolve(tmpDir, "outages-current.json"), "utf-8"));
    expect(current.records).toHaveLength(2);
    expect(current.records.map((r: { id: string }) => r.id).sort()).toEqual(["r1", "r3"]);

    // Archive should have 1 record (r2) in 2025-Q3
    const archivePath = resolve(tmpDir, "outages-archive/2025-Q3.json");
    expect(existsSync(archivePath)).toBe(true);
    const archive = JSON.parse(readFileSync(archivePath, "utf-8"));
    expect(archive.records).toHaveLength(1);
    expect(archive.records[0].id).toBe("r2");
  });

  it("should merge with existing archive files (idempotent)", () => {
    // Pre-existing archive
    const archiveDir = resolve(tmpDir, "outages-archive");
    mkdirSync(archiveDir, { recursive: true });
    const existingArchive = makeOutageFile([
      makeRecord("existing-1", "2025/08/15 00:00", "2025/09/01 00:00"),
    ]);
    writeFileSync(resolve(archiveDir, "2025-Q3.json"), JSON.stringify(existingArchive));

    // Current file with a new historical record in the same quarter
    const file = makeOutageFile([
      makeRecord("r1", "2026/03/01 00:00", null),               // current
      makeRecord("new-archive", "2025/07/01 00:00", "2025/08/01 00:00"), // historical, same Q3
    ]);
    writeFileSync(resolve(tmpDir, "outages-current.json"), JSON.stringify(file));

    archiveOutages(tmpDir);

    // Archive should have 2 records (existing + new)
    const archive = JSON.parse(readFileSync(resolve(archiveDir, "2025-Q3.json"), "utf-8"));
    expect(archive.records).toHaveLength(2);
    const ids = archive.records.map((r: { id: string }) => r.id).sort();
    expect(ids).toEqual(["existing-1", "new-archive"]);
  });

  it("should group archives by quarter correctly", () => {
    const file = makeOutageFile([
      makeRecord("r1", "2026/03/01 00:00", null),               // current
      makeRecord("h1", "2025/02/01 00:00", "2025/03/01 00:00"), // Q1
      makeRecord("h2", "2025/07/01 00:00", "2025/08/01 00:00"), // Q3
      makeRecord("h3", "2025/11/01 00:00", "2025/12/01 00:00"), // Q4
    ]);
    writeFileSync(resolve(tmpDir, "outages-current.json"), JSON.stringify(file));

    archiveOutages(tmpDir);

    const archiveDir = resolve(tmpDir, "outages-archive");
    expect(existsSync(resolve(archiveDir, "2025-Q1.json"))).toBe(true);
    expect(existsSync(resolve(archiveDir, "2025-Q3.json"))).toBe(true);
    expect(existsSync(resolve(archiveDir, "2025-Q4.json"))).toBe(true);

    const current = JSON.parse(readFileSync(resolve(tmpDir, "outages-current.json"), "utf-8"));
    expect(current.records).toHaveLength(1);
  });
});
