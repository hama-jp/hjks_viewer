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

export async function loadManifest(): Promise<LoadResult<DataManifest>> {
  try {
    const res = await fetch(`${getBasePath()}/data/manifest.json`);
    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status}: ${res.statusText}`, data: null };
    }
    const json = await res.json();
    const parsed = DataManifestSchema.parse(json);
    return { ok: true, data: parsed };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return { ok: false, error: message, data: null };
  }
}

export async function loadOutagesCurrent(): Promise<LoadResult<OutageFile["records"]> & { meta?: OutageFile["meta"] }> {
  try {
    const res = await fetch(`${getBasePath()}/data/outages-current.json`);
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

export async function loadOutageArchive(period: string): Promise<LoadResult<OutageFile["records"]> & { meta?: OutageFile["meta"] }> {
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
  try {
    const res = await fetch(`${getBasePath()}/data/units.json`);
    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status}: ${res.statusText}`, data: null };
    }
    const json = await res.json();
    // Support both { records: [...] } wrapper and raw array formats
    const records = Array.isArray(json) ? json : json.records;
    const parsed = z.array(NormalizedUnitSchema).parse(records);
    return { ok: true, data: parsed };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return { ok: false, error: message, data: null };
  }
}
