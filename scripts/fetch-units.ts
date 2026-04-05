#!/usr/bin/env npx tsx
/**
 * fetch-units.ts — Download unit master data from HJKS
 *
 * Usage: npx tsx scripts/fetch-units.ts
 */

import { mkdirSync, writeFileSync } from "fs";
import { resolve } from "path";
import { format } from "date-fns";
import { HjksClient } from "./lib/fetchers";
import { parseUnitsCsv } from "./lib/parsers";
import { normalizeUnits } from "./lib/normalizers";

// --- Constants ---

const PROJECT_ROOT = resolve(__dirname, "..");
const RAW_DIR = resolve(PROJECT_ROOT, "data/raw");
const NORMALIZED_DIR = resolve(PROJECT_ROOT, "data/normalized");
const OUTPUT_FILE = resolve(NORMALIZED_DIR, "units.json");

// --- Main ---

async function main(): Promise<void> {
  const client = new HjksClient();

  console.log("Initializing session...");
  await client.initSession();
  console.log("Session initialized. Downloading unit CSV...");

  const csvText = await client.downloadUnitsCsv();
  console.log(`Downloaded CSV (${csvText.length} bytes)`);

  // Save raw CSV
  const timestamp = format(new Date(), "yyyyMMdd-HHmmss");
  const rawFile = resolve(RAW_DIR, `units-${timestamp}.csv`);
  mkdirSync(RAW_DIR, { recursive: true });
  writeFileSync(rawFile, csvText, "utf-8");
  console.log(`Raw CSV saved to ${rawFile}`);

  // Parse and normalize
  const raw = parseUnitsCsv(csvText);
  console.log(`Parsed ${raw.length} raw records`);

  const normalized = normalizeUnits(raw);
  console.log(`Normalized ${normalized.length} records`);

  // Write output
  const output = {
    meta: {
      generatedAt: new Date().toISOString(),
      recordCount: normalized.length,
    },
    records: normalized,
  };

  mkdirSync(NORMALIZED_DIR, { recursive: true });
  writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), "utf-8");
  console.log(`Written ${normalized.length} records to ${OUTPUT_FILE}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
