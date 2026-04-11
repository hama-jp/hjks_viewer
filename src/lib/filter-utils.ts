import type { NormalizedOutage } from "@/types/outage";
import type { Filters } from "@/components/filters/useFilters";

/**
 * Parse a comma-separated URL parameter into a Set of strings.
 */
export function parseSet(param: string | null): Set<string> {
  return new Set(param?.split(",").filter(Boolean) ?? []);
}

/**
 * Apply all active filters to the outage records.
 * Pure function — no side effects.
 */
export function applyFilters(
  records: NormalizedOutage[],
  filters: Filters
): NormalizedOutage[] {
  let data = records;

  if (filters.areas.size > 0) {
    data = data.filter((r) => filters.areas.has(r.area));
  }
  if (filters.formats.size > 0) {
    data = data.filter((r) => filters.formats.has(r.format));
  }
  if (filters.maintemodes.size > 0) {
    data = data.filter((r) => filters.maintemodes.has(r.maintemode));
  }

  if (filters.searchText) {
    const q = filters.searchText.toLowerCase();
    data = data.filter(
      (r) =>
        r.company.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q) ||
        r.unitname.toLowerCase().includes(q) ||
        r.areaName.toLowerCase().includes(q) ||
        r.formatName.toLowerCase().includes(q) ||
        r.factor.toLowerCase().includes(q)
    );
  }

  // Date range filter: startdt format is "YYYY/MM/DD HH:mm"
  // Simple string comparison works because the format is lexicographically ordered.
  if (filters.dateFrom) {
    // Convert "2024-01-15" (input type=date) to "2024/01/15" for comparison
    const from = filters.dateFrom.replace(/-/g, "/");
    data = data.filter((r) => r.startdt >= from);
  }
  if (filters.dateTo) {
    const to = filters.dateTo.replace(/-/g, "/") + " 23:59";
    data = data.filter((r) => r.startdt <= to);
  }

  return data;
}

export type SortKey =
  | "areaName"
  | "company"
  | "name"
  | "unitname"
  | "maxcapacity"
  | "maintemodeName"
  | "assortmentName"
  | "startdt"
  | "outlook";

export type SortDir = "asc" | "desc";

/**
 * Sort records by a given key and direction.
 * Returns a new array — does not mutate.
 */
export function applySort(
  records: NormalizedOutage[],
  sortKey: SortKey,
  sortDir: SortDir
): NormalizedOutage[] {
  return [...records].sort((a, b) => {
    const av = a[sortKey];
    const bv = b[sortKey];
    if (typeof av === "number" && typeof bv === "number") {
      return sortDir === "asc" ? av - bv : bv - av;
    }
    const as = String(av ?? "");
    const bs = String(bv ?? "");
    return sortDir === "asc" ? as.localeCompare(bs) : bs.localeCompare(as);
  });
}
