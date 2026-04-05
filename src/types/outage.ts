import type { z } from "zod";
import type {
  RawOutageRecordSchema,
  NormalizedOutageSchema,
  RawUnitRecordSchema,
  NormalizedUnitSchema,
  OutageFileSchema,
  DataManifestSchema,
} from "@/lib/schemas";

// Raw types (parsed from CSV, all strings)
export type RawOutageRecord = z.infer<typeof RawOutageRecordSchema>;
export type RawUnitRecord = z.infer<typeof RawUnitRecordSchema>;

// Normalized types (validated & transformed)
export type NormalizedOutage = z.infer<typeof NormalizedOutageSchema>;
export type NormalizedUnit = z.infer<typeof NormalizedUnitSchema>;

// File wrapper types
export type OutageFile = z.infer<typeof OutageFileSchema>;
export type DataManifest = z.infer<typeof DataManifestSchema>;
