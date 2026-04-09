"use client";

import { useMemo, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { parseSet } from "@/lib/filter-utils";

export type Filters = {
  areas: Set<string>;
  formats: Set<string>;
  maintemodes: Set<string>;
  dateFrom: string;
  dateTo: string;
  searchText: string;
};

export function useFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const filters: Filters = useMemo(
    () => ({
      areas: parseSet(searchParams.get("areas")),
      formats: parseSet(searchParams.get("formats")),
      maintemodes: parseSet(searchParams.get("maintemodes")),
      dateFrom: searchParams.get("dateFrom") ?? "",
      dateTo: searchParams.get("dateTo") ?? "",
      searchText: searchParams.get("q") ?? "",
    }),
    [searchParams]
  );

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }
      router.push(`?${params.toString()}`, { scroll: false });
    },
    [searchParams, router]
  );

  const setFilter = useCallback(
    (
      name: keyof Filters,
      value: Set<string> | string
    ) => {
      if (value instanceof Set) {
        const serialized = [...value].join(",");
        updateParams({ [name]: serialized || null, page: null });
      } else {
        const paramKey = name === "searchText" ? "q" : name;
        updateParams({ [paramKey]: value || null, page: null });
      }
    },
    [updateParams]
  );

  const resetFilters = useCallback(() => {
    updateParams({
      areas: null,
      formats: null,
      maintemodes: null,
      dateFrom: null,
      dateTo: null,
      q: null,
      page: null,
    });
  }, [updateParams]);

  const hasActiveFilters =
    filters.areas.size > 0 ||
    filters.formats.size > 0 ||
    filters.maintemodes.size > 0 ||
    filters.dateFrom !== "" ||
    filters.dateTo !== "" ||
    filters.searchText !== "";

  return { filters, setFilter, resetFilters, hasActiveFilters };
}
