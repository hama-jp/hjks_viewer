#!/usr/bin/env npx tsx
/**
 * sync-public-data.ts — Copy normalized data to public/ and generate manifest
 *
 * Usage: npx tsx scripts/sync-public-data.ts
 */

import {
  mkdirSync,
  copyFileSync,
  readFileSync,
  writeFileSync,
  existsSync,
  statSync,
  readdirSync,
} from "fs";
import { resolve, basename } from "path";
import { DataManifestSchema } from "@/lib/schemas";
import type { DataManifest } from "@/types/outage";

// --- Constants ---

const PROJECT_ROOT = resolve(__dirname, "..");
const NORMALIZED_DIR = resolve(PROJECT_ROOT, "data/normalized");
const PUBLIC_DATA_DIR = resolve(PROJECT_ROOT, "public/data");

// --- Helpers ---

function copyIfExists(src: string, dest: string): boolean {
  if (!existsSync(src)) {
    console.warn(`Source not found, skipping: ${src}`);
    return false;
  }
  mkdirSync(resolve(dest, ".."), { recursive: true });
  copyFileSync(src, dest);
  console.log(`Copied ${basename(src)} -> ${dest}`);
  return true;
}

function getRecordCount(filePath: string): number {
  try {
    const content = readFileSync(filePath, "utf-8");
    const data = JSON.parse(content);
    return data.records?.length ?? data.meta?.recordCount ?? 0;
  } catch {
    return 0;
  }
}

function getFileSize(filePath: string): number {
  try {
    return statSync(filePath).size;
  } catch {
    return 0;
  }
}

// --- Main ---

function main(): void {
  mkdirSync(PUBLIC_DATA_DIR, { recursive: true });

  // Copy current outages
  const outagesSrc = resolve(NORMALIZED_DIR, "outages-current.json");
  const outagesDest = resolve(PUBLIC_DATA_DIR, "outages-current.json");
  const hasOutages = copyIfExists(outagesSrc, outagesDest);

  // Copy units
  const unitsSrc = resolve(NORMALIZED_DIR, "units.json");
  const unitsDest = resolve(PUBLIC_DATA_DIR, "units.json");
  const hasUnits = copyIfExists(unitsSrc, unitsDest);

  // Find archive files in outages-archive/ directory (YYYY-QN.json)
  const archives: { path: string; period: string; recordCount: number }[] = [];
  const archiveDir = resolve(NORMALIZED_DIR, "outages-archive");
  if (existsSync(archiveDir)) {
    const publicArchiveDir = resolve(PUBLIC_DATA_DIR, "outages-archive");
    mkdirSync(publicArchiveDir, { recursive: true });

    const files = readdirSync(archiveDir);
    for (const file of files) {
      if (file.endsWith(".json")) {
        const src = resolve(archiveDir, file);
        const dest = resolve(publicArchiveDir, file);
        copyIfExists(src, dest);

        // Extract period from filename (e.g., 2025-Q4.json -> 2025-Q4)
        const period = file.replace(/\.json$/, "");
        archives.push({
          path: `data/outages-archive/${file}`,
          period,
          recordCount: getRecordCount(src),
        });
      }
    }
  }

  // Also check for legacy flat archive files (outages-YYYY*.json in normalized dir)
  if (existsSync(NORMALIZED_DIR)) {
    const files = readdirSync(NORMALIZED_DIR);
    for (const file of files) {
      if (
        file.startsWith("outages-") &&
        file !== "outages-current.json" &&
        file.endsWith(".json")
      ) {
        const src = resolve(NORMALIZED_DIR, file);
        const dest = resolve(PUBLIC_DATA_DIR, file);
        copyIfExists(src, dest);

        const periodMatch = file.match(/outages-(.+)\.json/);
        archives.push({
          path: `data/${file}`,
          period: periodMatch?.[1] ?? file,
          recordCount: getRecordCount(src),
        });
      }
    }
  }

  // Generate manifest
  const manifest: DataManifest = {
    lastUpdated: new Date().toISOString(),
    files: {
      current: {
        path: "data/outages-current.json",
        recordCount: hasOutages ? getRecordCount(outagesDest) : 0,
        sizeBytes: hasOutages ? getFileSize(outagesDest) : 0,
      },
      archives,
      units: {
        path: "data/units.json",
        recordCount: hasUnits ? getRecordCount(unitsDest) : 0,
      },
    },
  };

  // Validate manifest
  const validation = DataManifestSchema.safeParse(manifest);
  if (!validation.success) {
    console.error("Manifest validation failed:", validation.error.message);
    process.exit(1);
  }

  const manifestPath = resolve(PUBLIC_DATA_DIR, "manifest.json");
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf-8");
  console.log(`Manifest written to ${manifestPath}`);

  // Summary
  console.log("\n--- Sync Summary ---");
  console.log(`  Outages: ${manifest.files.current.recordCount} records (${manifest.files.current.sizeBytes} bytes)`);
  console.log(`  Archives: ${archives.length} files`);
  console.log(`  Units: ${manifest.files.units.recordCount} records`);
}

main();
