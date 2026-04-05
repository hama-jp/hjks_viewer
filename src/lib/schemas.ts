import { z } from "zod";

// --- Raw data schemas (all strings, straight from CSV) ---

export const RawOutageRecordSchema = z.object({
  area: z.string(),
  company: z.string(),
  plantcd: z.string(),
  name: z.string(),
  format: z.string(),
  unitname: z.string(),
  maxcapacity: z.string(),
  maintemode: z.string(),
  assortment: z.string(),
  downcapacity: z.string(),
  startdt: z.string(),
  outlook: z.string(),
  restartschdt: z.string(),
  factor: z.string(),
  upddt: z.string(),
});

export const RawUnitRecordSchema = z.object({
  area: z.string(),
  company: z.string(),
  plantcd: z.string(),
  name: z.string(),
  format: z.string(),
  unitname: z.string(),
  maxcapacity: z.string(),
  nextmaxcapacity: z.string(),
  nextmaxcapacitystartdt: z.string(),
  startdt: z.string(),
  enddt: z.string(),
  upddt: z.string(),
});

// --- Normalized data schemas (validated & transformed) ---

export const NormalizedOutageSchema = z.object({
  id: z.string(),
  area: z.string(),
  areaName: z.string(),
  company: z.string(),
  plantcd: z.string(),
  name: z.string(),
  format: z.string(),
  formatName: z.string(),
  unitname: z.string(),
  maxcapacity: z.number(),
  downcapacity: z.number(),
  maintemode: z.string(),
  maintemodeName: z.string(),
  assortment: z.string(),
  assortmentName: z.string(),
  startdt: z.string(),
  restartschdt: z.string().nullable(),
  outlook: z.string(),
  factor: z.string(),
  upddt: z.string(),
  fetchedAt: z.string(),
});

export const NormalizedUnitSchema = z.object({
  id: z.string(),
  area: z.string(),
  areaName: z.string(),
  company: z.string(),
  plantcd: z.string(),
  name: z.string(),
  format: z.string(),
  formatName: z.string(),
  unitname: z.string(),
  maxcapacity: z.number(),
  nextmaxcapacity: z.number().nullable(),
  nextmaxcapacitystartdt: z.string().nullable(),
  startdt: z.string().nullable(),
  enddt: z.string().nullable(),
  upddt: z.string(),
});

// --- File wrapper schemas ---

export const OutageFileSchema = z.object({
  meta: z.object({
    generatedAt: z.string(),
    recordCount: z.number(),
    source: z.enum(["csv", "ajax", "toppage", "playwright"]),
  }),
  records: z.array(NormalizedOutageSchema),
});

export const DataManifestSchema = z.object({
  lastUpdated: z.string(),
  files: z.object({
    current: z.object({
      path: z.string(),
      recordCount: z.number(),
      sizeBytes: z.number(),
    }),
    archives: z.array(
      z.object({
        path: z.string(),
        period: z.string(),
        recordCount: z.number(),
      })
    ),
    units: z.object({
      path: z.string(),
      recordCount: z.number(),
    }),
  }),
});
