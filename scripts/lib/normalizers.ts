import { createHash } from "crypto";
import { NormalizedOutageSchema, NormalizedUnitSchema } from "@/lib/schemas";
import {
  AREAS_REVERSE,
  FORMATS_REVERSE,
  MAINTEMODES_REVERSE,
  ASSORTMENTS_REVERSE,
  getAreaName,
  getFormatName,
  getMaintemodeName,
  getAssortmentName,
} from "@/lib/constants";
import type {
  RawOutageRecord,
  RawUnitRecord,
  NormalizedOutage,
  NormalizedUnit,
} from "@/types/outage";

function generateId(plantcd: string, unitname: string, startdt: string): string {
  const key = `${plantcd}_${unitname}_${startdt}`;
  return createHash("sha256").update(key).digest("hex").slice(0, 16);
}

function toNumberOrNull(value: string): number | null {
  if (!value || value.trim() === "") return null;
  // Strip commas and normalize full-width digits to half-width
  const cleaned = value
    .replace(/,/g, "")
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0));
  const num = Number(cleaned);
  return isNaN(num) ? null : num;
}

function toNullableString(value: string): string | null {
  return value.trim() === "" ? null : value.trim();
}

/**
 * Normalize full-width parentheses to half-width so that reverse lookups
 * work for both `火力(石炭)` and `火力（石炭）`.
 */
function normalizeParens(s: string): string {
  return s.replace(/（/g, "(").replace(/）/g, ")");
}

/**
 * Resolve a display name to a code using a reverse map.
 * If the value is already a code (numeric), return it as-is.
 */
function resolveCode(
  displayName: string,
  reverseMap: Record<string, string>
): string {
  // Already a code?
  if (/^\d+$/.test(displayName)) return displayName;
  // Try exact match first, then normalized (full-width → half-width parens)
  return (
    reverseMap[displayName] ??
    reverseMap[normalizeParens(displayName)] ??
    displayName
  );
}

export function normalizeOutages(
  raw: RawOutageRecord[],
  fetchedAt?: string
): NormalizedOutage[] {
  const ts = fetchedAt ?? new Date().toISOString();
  const results: NormalizedOutage[] = [];

  for (const r of raw) {
    const areaCode = resolveCode(r.area, AREAS_REVERSE);
    const formatCode = resolveCode(r.format, FORMATS_REVERSE);
    const maintemodeCode = resolveCode(r.maintemode, MAINTEMODES_REVERSE);
    const assortmentCode = resolveCode(r.assortment, ASSORTMENTS_REVERSE);

    const maxcapacity = toNumberOrNull(r.maxcapacity);
    // downcapacity is empty for full outages (計画停止/計画外停止) — default to maxcapacity
    const downcapacity = toNumberOrNull(r.downcapacity) ?? maxcapacity ?? 0;

    // Skip records with invalid maxcapacity
    if (maxcapacity === null) continue;

    const candidate = {
      id: generateId(r.plantcd, r.unitname, r.startdt),
      area: areaCode,
      areaName: getAreaName(areaCode),
      company: r.company,
      plantcd: r.plantcd,
      name: r.name,
      format: formatCode,
      formatName: getFormatName(formatCode),
      unitname: r.unitname,
      maxcapacity,
      downcapacity,
      maintemode: maintemodeCode,
      maintemodeName: getMaintemodeName(maintemodeCode),
      assortment: assortmentCode,
      assortmentName: getAssortmentName(assortmentCode),
      startdt: r.startdt,
      restartschdt: toNullableString(r.restartschdt),
      outlook: r.outlook,
      factor: r.factor.replace(/\r?\n/g, " / ").replace(/\r/g, "").trim(),
      upddt: r.upddt,
      fetchedAt: ts,
    };

    const validation = NormalizedOutageSchema.safeParse(candidate);
    if (validation.success) {
      results.push(validation.data);
    }
  }

  return results;
}

export function normalizeUnits(raw: RawUnitRecord[]): NormalizedUnit[] {
  const results: NormalizedUnit[] = [];

  for (const r of raw) {
    const areaCode = resolveCode(r.area, AREAS_REVERSE);
    const formatCode = resolveCode(r.format, FORMATS_REVERSE);
    const maxcapacity = toNumberOrNull(r.maxcapacity);

    if (maxcapacity === null) continue;

    const candidate = {
      id: generateId(r.plantcd, r.unitname, r.startdt || "no-start"),
      area: areaCode,
      areaName: getAreaName(areaCode),
      company: r.company,
      plantcd: r.plantcd,
      name: r.name,
      format: formatCode,
      formatName: getFormatName(formatCode),
      unitname: r.unitname,
      maxcapacity,
      nextmaxcapacity: toNumberOrNull(r.nextmaxcapacity),
      nextmaxcapacitystartdt: toNullableString(r.nextmaxcapacitystartdt),
      startdt: toNullableString(r.startdt),
      enddt: toNullableString(r.enddt),
      upddt: r.upddt,
    };

    const validation = NormalizedUnitSchema.safeParse(candidate);
    if (validation.success) {
      results.push(validation.data);
    }
  }

  return results;
}

export function deduplicateOutages(
  existing: NormalizedOutage[],
  incoming: NormalizedOutage[]
): NormalizedOutage[] {
  const map = new Map<string, NormalizedOutage>();

  for (const r of existing) {
    map.set(r.id, r);
  }
  // Incoming overwrites existing (newer data wins)
  for (const r of incoming) {
    map.set(r.id, r);
  }

  return Array.from(map.values());
}
