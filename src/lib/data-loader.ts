import { OutageFileSchema, DataManifestSchema } from "@/lib/schemas";
import type { OutageFile, DataManifest, NormalizedUnit } from "@/types/outage";
import { NormalizedUnitSchema } from "@/lib/schemas";
import { z } from "zod";

export function getBasePath(): string {
  return process.env.NEXT_PUBLIC_BASE_PATH || "";
}

type LoadResult<T> = {
  ok: true;
  data: T;
  meta?: OutageFile["meta"];
} | {
  ok: false;
  error: string;
  data: null;
};

async function fetchAndParse<T>(
  url: string,
  parse: (json: unknown) => T
): Promise<LoadResult<T>> {
  try {
    const res = await fetch(`${getBasePath()}${url}`);
    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status}: ${res.statusText}`, data: null };
    }
    const json = await res.json();
    const data = parse(json);
    return { ok: true, data };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return { ok: false, error: message, data: null };
  }
}

export async function loadManifest(): Promise<LoadResult<DataManifest>> {
  return fetchAndParse("/data/manifest.json", (json) => DataManifestSchema.parse(json));
}

type OutageResult = LoadResult<OutageFile["records"]> & { meta?: OutageFile["meta"] };

let cachedResult: Promise<OutageResult> | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function invalidateCache(): void {
  cachedResult = null;
  cacheTimestamp = 0;
}

export async function loadOutagesCurrent(): Promise<OutageResult> {
  const now = Date.now();
  if (cachedResult && now - cacheTimestamp < CACHE_TTL) {
    return cachedResult;
  }

  const promise = (async (): Promise<OutageResult> => {
    try {
      const res = await fetch(`${getBasePath()}/data/outages-current.json`);
      if (!res.ok) {
        return { ok: false, error: `HTTP ${res.status}: ${res.statusText}`, data: null };
      }
      const json = await res.json();
      const parsed = OutageFileSchema.parse(json);
      return { ok: true, data: parsed.records, meta: parsed.meta };
    } catch (e) {
      invalidateCache();
      const message = e instanceof Error ? e.message : "Unknown error";
      return { ok: false, error: message, data: null };
    }
  })();

  cachedResult = promise;
  cacheTimestamp = now;
  return promise;
}

export async function loadOutageArchive(period: string): Promise<OutageResult> {
  try {
    // Try outages-archive/ subdirectory first, then flat path
    let res = await fetch(`${getBasePath()}/data/outages-archive/${period}.json`);
    if (!res.ok) {
      // Fallback: try flat file (legacy format)
      res = await fetch(`${getBasePath()}/data/outages-${period}.json`);
    }
    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status}: ${res.statusText}`, data: null };
    }
    const json = await res.json();
    const parsed = OutageFileSchema.parse(json);
    return { ok: true, data: parsed.records, meta: parsed.meta };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return { ok: false, error: message, data: null };
  }
}

export async function loadUnits(): Promise<LoadResult<NormalizedUnit[]>> {
  return fetchAndParse("/data/units.json", (json) => {
    // Support both { records: [...] } wrapper and raw array formats
    const records = Array.isArray(json) ? json : (json as { records: unknown }).records;
    return z.array(NormalizedUnitSchema).parse(records);
  });
}
