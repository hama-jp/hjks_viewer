"use client";

import { useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import type { SortKey, SortDir } from "@/lib/filter-utils";

const DEFAULT_PAGE_SIZE = 50;

export function useTableState() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const sortKey = (searchParams.get("sort") as SortKey) ?? "startdt";
  const sortDir = (searchParams.get("dir") as SortDir) ?? "desc";
  const currentPage = parseInt(searchParams.get("page") ?? "1", 10) || 1;
  const pageSize = DEFAULT_PAGE_SIZE;

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

  const setSort = useCallback(
    (key: SortKey) => {
      if (sortKey === key) {
        updateParams({ dir: sortDir === "asc" ? "desc" : "asc" });
      } else {
        updateParams({ sort: key, dir: "asc" });
      }
    },
    [sortKey, sortDir, updateParams]
  );

  const setPage = useCallback(
    (page: number) => {
      updateParams({ page: String(page) });
    },
    [updateParams]
  );

  return { sortKey, sortDir, currentPage, pageSize, setSort, setPage };
}
