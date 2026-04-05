#!/usr/bin/env npx tsx
/**
 * fetch-outages.ts — CLI entry point for fetching HJKS outage data
 *
 * Usage:
 *   npx tsx scripts/fetch-outages.ts --mode daily|now|backfill|full [--from YYYY-MM-DD] [--to YYYY-MM-DD]
 */

import { mkdirSync, writeFileSync, readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { format, subDays } from "date-fns";
import { HjksClient, type FetchParams } from "./lib/fetchers";
import { parseOutagesCsv, parseTopPageHtml } from "./lib/parsers";
import {
  normalizeOutages,
  deduplicateOutages,
} from "./lib/normalizers";
import { OutageFileSchema } from "@/lib/schemas";
import type { NormalizedOutage, OutageFile } from "@/types/outage";

// --- Constants ---

const PROJECT_ROOT = resolve(__dirname, "..");
const RAW_DIR = resolve(PROJECT_ROOT, "data/raw");
const NORMALIZED_DIR = resolve(PROJECT_ROOT, "data/normalized");
const OUTPUT_FILE = resolve(NORMALIZED_DIR, "outages-current.json");

// --- CLI argument parsing ---

type Mode = "daily" | "now" | "backfill" | "full";

interface CliArgs {
  mode: Mode;
  from?: string;
  to?: string;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  let mode: Mode | undefined;
  let from: string | undefined;
  let to: string | undefined;

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--mode":
        mode = args[++i] as Mode;
        break;
      case "--from":
        from = args[++i];
        break;
      case "--to":
        to = args[++i];
        break;
    }
  }

  if (!mode || !["daily", "now", "backfill", "full"].includes(mode)) {
    console.error(
      "Usage: npx tsx scripts/fetch-outages.ts --mode daily|now|backfill|full [--from YYYY-MM-DD] [--to YYYY-MM-DD]"
    );
    process.exit(1);
  }

  if (mode === "backfill" && (!from || !to)) {
    console.error("--from and --to are required for backfill mode");
    process.exit(1);
  }

  return { mode, from, to };
}

// --- Date range helpers ---

function buildFetchParams(args: CliArgs): FetchParams {
  const today = new Date();
  const params: FetchParams = {};

  switch (args.mode) {
    case "daily": {
      const yesterday = subDays(today, 1);
      params.startdtfrom = format(yesterday, "yyyy/MM/dd");
      params.startdtto = format(today, "yyyy/MM/dd");
      break;
    }
    case "now": {
      params.startdtfrom = format(today, "yyyy/MM/dd");
      params.startdtto = format(today, "yyyy/MM/dd");
      break;
    }
    case "backfill": {
      // Convert YYYY-MM-DD to yyyy/MM/dd
      params.startdtfrom = args.from!.replace(/-/g, "/");
      params.startdtto = args.to!.replace(/-/g, "/");
      break;
    }
    case "full":
      // No date filter
      break;
  }

  return params;
}

// --- Fetch strategies ---

async function fetchViaCsv(
  client: HjksClient,
  params: FetchParams
): Promise<{ records: NormalizedOutage[]; rawCsv: string }> {
  console.log("Initializing session...");
  await client.initSession();
  console.log("Session initialized. Downloading CSV...");

  const csvText = await client.downloadOutagesCsv(params);
  console.log(`Downloaded CSV (${csvText.length} bytes)`);

  // Save raw CSV
  const timestamp = format(new Date(), "yyyyMMdd-HHmmss");
  const rawFile = resolve(RAW_DIR, `outages-${timestamp}.csv`);
  mkdirSync(RAW_DIR, { recursive: true });
  writeFileSync(rawFile, csvText, "utf-8");
  console.log(`Raw CSV saved to ${rawFile}`);

  const raw = parseOutagesCsv(csvText);
  console.log(`Parsed ${raw.length} raw records`);

  const normalized = normalizeOutages(raw);
  console.log(`Normalized ${normalized.length} records`);

  return { records: normalized, rawCsv: csvText };
}

async function fetchViaTopPage(
  client: HjksClient
): Promise<NormalizedOutage[]> {
  console.log("Falling back to top page scraping...");
  const html = await client.scrapeTopPage();
  console.log(`Downloaded top page (${html.length} bytes)`);

  const raw = parseTopPageHtml(html);
  console.log(`Parsed ${raw.length} raw records from top page`);

  const normalized = normalizeOutages(raw);
  console.log(`Normalized ${normalized.length} records`);

  return normalized;
}

// --- Load existing data ---

function loadExisting(): NormalizedOutage[] {
  if (!existsSync(OUTPUT_FILE)) return [];
  try {
    const content = readFileSync(OUTPUT_FILE, "utf-8");
    const parsed = JSON.parse(content) as OutageFile;
    return parsed.records ?? [];
  } catch {
    console.warn("Could not load existing data, starting fresh");
    return [];
  }
}

// --- Main ---

async function main(): Promise<void> {
  const args = parseArgs();
  console.log(`Mode: ${args.mode}`);

  const client = new HjksClient();
  const params = buildFetchParams(args);
  let records: NormalizedOutage[];
  let source: "csv" | "toppage" = "csv";

  // Strategy 1: CSV download
  try {
    const result = await fetchViaCsv(client, params);
    records = result.records;
  } catch (err) {
    console.warn(`CSV fetch failed: ${err instanceof Error ? err.message : err}`);

    // Strategy 2: Top page scraping (fallback, only gets latest)
    try {
      records = await fetchViaTopPage(client);
      source = "toppage";
    } catch (err2) {
      console.error(
        `Top page scrape also failed: ${err2 instanceof Error ? err2.message : err2}`
      );
      console.error("HJKS appears to be down. Exiting.");
      process.exit(1);
    }
  }

  // Merge with existing data (dedup)
  const existing = loadExisting();
  if (existing.length > 0) {
    console.log(`Merging with ${existing.length} existing records...`);
    records = deduplicateOutages(existing, records);
  }

  console.log(`Total records after dedup: ${records.length}`);

  // Write output
  const outageFile: OutageFile = {
    meta: {
      generatedAt: new Date().toISOString(),
      recordCount: records.length,
      source,
    },
    records,
  };

  // Validate with schema
  const validation = OutageFileSchema.safeParse(outageFile);
  if (!validation.success) {
    console.error("Output validation failed:", validation.error.message);
    process.exit(1);
  }

  mkdirSync(NORMALIZED_DIR, { recursive: true });
  writeFileSync(OUTPUT_FILE, JSON.stringify(outageFile, null, 2), "utf-8");
  console.log(`Written ${records.length} records to ${OUTPUT_FILE}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
