/**
 * archiver.ts — Quarterly archive management for outage data
 *
 * Separates historical (already restarted) outages into quarterly archive files.
 * Can be called from fetch-outages.ts or run independently.
 */

import {
  mkdirSync,
  readFileSync,
  writeFileSync,
  existsSync,
} from "fs";
import { resolve } from "path";
import { OutageFileSchema } from "@/lib/schemas";
import { parseOutageDateAsJST } from "@/lib/date-utils";
import type { NormalizedOutage, OutageFile } from "@/types/outage";

// --- Quarter helpers ---

/**
 * Parse a date string in "YYYY/MM/DD HH:mm" or ISO format and return the quarter label.
 */
export function getQuarter(dateStr: string): string {
  // Handle "YYYY/MM/DD HH:mm" format
  const slashMatch = dateStr.match(/^(\d{4})\/(\d{2})/);
  if (slashMatch) {
    const year = slashMatch[1];
    const month = parseInt(slashMatch[2], 10);
    const q = Math.ceil(month / 3);
    return `${year}-Q${q}`;
  }

  // Handle ISO format "YYYY-MM-DDTHH:mm:ss"
  const isoMatch = dateStr.match(/^(\d{4})-(\d{2})/);
  if (isoMatch) {
    const year = isoMatch[1];
    const month = parseInt(isoMatch[2], 10);
    const q = Math.ceil(month / 3);
    return `${year}-Q${q}`;
  }

  throw new Error(`Cannot parse date for quarter: ${dateStr}`);
}

/**
 * Check if a restartschdt is in the past (record has already restarted).
 * Uses parseOutageDateAsJST to handle timezone correctly regardless of server locale.
 */
function isHistorical(record: NormalizedOutage, now: Date): boolean {
  if (!record.restartschdt) return false;

  try {
    const restartDate = parseOutageDateAsJST(record.restartschdt);
    return restartDate < now;
  } catch {
    return false;
  }
}

/**
 * Archive outages that have already restarted into quarterly archive files.
 * Idempotent: merges with existing archive files.
 */
export function archiveOutages(normalizedDir: string): void {
  const currentFile = resolve(normalizedDir, "outages-current.json");
  if (!existsSync(currentFile)) {
    console.log("No outages-current.json found, skipping archive step.");
    return;
  }

  const content = readFileSync(currentFile, "utf-8");
  const parsed = OutageFileSchema.safeParse(JSON.parse(content));
  if (!parsed.success) {
    console.error("Failed to parse outages-current.json:", parsed.error.message);
    return;
  }

  const outageFile = parsed.data;
  const now = new Date();

  // Partition into current (still active) and historical (already restarted)
  const current: NormalizedOutage[] = [];
  const historical: NormalizedOutage[] = [];

  for (const record of outageFile.records) {
    if (isHistorical(record, now)) {
      historical.push(record);
    } else {
      current.push(record);
    }
  }

  if (historical.length === 0) {
    console.log("No historical records to archive.");
    return;
  }

  console.log(
    `Archiving ${historical.length} historical records (${current.length} remain current)`
  );

  // Group historical records by quarter based on startdt
  const byQuarter = new Map<string, NormalizedOutage[]>();
  for (const record of historical) {
    const quarter = getQuarter(record.startdt);
    const existing = byQuarter.get(quarter) ?? [];
    existing.push(record);
    byQuarter.set(quarter, existing);
  }

  // Write/merge each quarter's archive file
  const archiveDir = resolve(normalizedDir, "outages-archive");
  mkdirSync(archiveDir, { recursive: true });

  for (const [quarter, records] of byQuarter) {
    const archiveFile = resolve(archiveDir, `${quarter}.json`);
    let mergedRecords: NormalizedOutage[] = [];

    // Load existing archive if present (idempotent merge)
    if (existsSync(archiveFile)) {
      try {
        const existingContent = readFileSync(archiveFile, "utf-8");
        const existingParsed = OutageFileSchema.safeParse(
          JSON.parse(existingContent)
        );
        if (existingParsed.success) {
          mergedRecords = existingParsed.data.records;
        }
      } catch {
        console.warn(`Could not load existing archive ${archiveFile}, starting fresh`);
      }
    }

    // Deduplicate by id (incoming overwrites existing)
    const map = new Map<string, NormalizedOutage>();
    for (const r of mergedRecords) {
      map.set(r.id, r);
    }
    for (const r of records) {
      map.set(r.id, r);
    }
    mergedRecords = Array.from(map.values());

    const archiveOutput: OutageFile = {
      meta: {
        generatedAt: now.toISOString(),
        recordCount: mergedRecords.length,
        source: outageFile.meta.source,
      },
      records: mergedRecords,
    };

    // Validate before writing
    const validation = OutageFileSchema.safeParse(archiveOutput);
    if (!validation.success) {
      console.error(
        `Archive validation failed for ${quarter}:`,
        validation.error.message
      );
      continue;
    }

    writeFileSync(archiveFile, JSON.stringify(archiveOutput, null, 2), "utf-8");
    console.log(
      `  Archived ${quarter}: ${mergedRecords.length} records -> ${archiveFile}`
    );
  }

  // Update outages-current.json to only contain active outages
  const updatedCurrent: OutageFile = {
    meta: {
      generatedAt: now.toISOString(),
      recordCount: current.length,
      source: outageFile.meta.source,
    },
    records: current,
  };

  const currentValidation = OutageFileSchema.safeParse(updatedCurrent);
  if (!currentValidation.success) {
    console.error(
      "Current file validation failed after archive:",
      currentValidation.error.message
    );
    return;
  }

  writeFileSync(currentFile, JSON.stringify(updatedCurrent, null, 2), "utf-8");
  console.log(
    `Updated outages-current.json: ${current.length} active records`
  );
}
