"use client";

import { useEffect, useState, useMemo, useSyncExternalStore } from "react";
import { AREAS, FORMATS, MAINTEMODES } from "@/lib/constants";
import CheckboxGroup from "./CheckboxGroup";
import DateRangeFilter from "./DateRangeFilter";
import { useFilters } from "./useFilters";
import type { Filters } from "./useFilters";

const SEARCH_DEBOUNCE_MS = 300;

const subscribeMobile = (cb: () => void) => {
  const mql = window.matchMedia("(max-width: 639px)");
  mql.addEventListener("change", cb);
  return () => mql.removeEventListener("change", cb);
};
const getIsMobile = () => window.matchMedia("(max-width: 639px)").matches;
const getServerIsMobile = () => false;

export default function FilterPanel() {
  const { filters, setFilter, resetFilters, hasActiveFilters } = useFilters();
  const isMobile = useSyncExternalStore(subscribeMobile, getIsMobile, getServerIsMobile);
  const [userCollapsed, setUserCollapsed] = useState<boolean | null>(null);
  const collapsed = userCollapsed ?? isMobile;

  // Local state lets typing feel instant; URL is updated only after the user pauses.
  const [searchInput, setSearchInput] = useState(filters.searchText);
  const [lastCommitted, setLastCommitted] = useState(filters.searchText);

  // If the URL value changes externally (e.g. filter reset), adopt it as the new baseline.
  // This is React's "adjusting state during render" pattern and avoids an extra effect/render.
  if (filters.searchText !== lastCommitted) {
    setLastCommitted(filters.searchText);
    setSearchInput(filters.searchText);
  }

  useEffect(() => {
    if (searchInput === lastCommitted) return;
    const handle = window.setTimeout(() => {
      setLastCommitted(searchInput);
      setFilter("searchText", searchInput);
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [searchInput, lastCommitted, setFilter]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.areas.size > 0) count++;
    if (filters.formats.size > 0) count++;
    if (filters.maintemodes.size > 0) count++;
    if (filters.dateFrom) count++;
    if (filters.dateTo) count++;
    if (filters.searchText) count++;
    return count;
  }, [filters]);

  return (
    <div className={`card mb-6 ${collapsed ? "p-4 sm:p-5" : "p-5 sm:p-6"}`}>
      <div
        className={`flex items-center justify-between ${
          collapsed ? "" : "mb-4"
        }`}
      >
        <h2 className="text-sm font-semibold text-[var(--text)]">
          フィルター
          {activeFilterCount > 0 && (
            <span className="ml-2 inline-flex items-center rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700 dark:bg-brand-500/15 dark:text-brand-400">
              {activeFilterCount}件適用中
            </span>
          )}
        </h2>
        <button
          onClick={() => setUserCollapsed((v) => !(v ?? isMobile))}
          className="text-sm font-medium text-muted transition-colors hover:text-[var(--text)]"
        >
          {collapsed ? "展開" : "折りたたむ"}
        </button>
      </div>

      <div className={`space-y-4 ${collapsed ? "hidden" : ""}`}>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[var(--text)]">
            フリーテキスト検索
          </label>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="事業者名、発電所名、要因など..."
            className="field sm:w-80"
          />
        </div>

        <CheckboxGroup
          label="エリア"
          options={AREAS}
          selected={filters.areas}
          onChange={(s) => setFilter("areas", s)}
        />
        <CheckboxGroup
          label="発電形式"
          options={FORMATS}
          selected={filters.formats}
          onChange={(s) => setFilter("formats", s)}
        />
        <CheckboxGroup
          label="停止区分"
          options={MAINTEMODES}
          selected={filters.maintemodes}
          onChange={(s) => setFilter("maintemodes", s)}
        />

        <DateRangeFilter
          dateFrom={filters.dateFrom}
          dateTo={filters.dateTo}
          onChange={(field, value) => setFilter(field as keyof Filters, value)}
        />

        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className="text-sm font-medium text-brand-600 underline decoration-brand-300 underline-offset-2 hover:text-brand-700 dark:text-brand-400"
          >
            フィルターをリセット
          </button>
        )}
      </div>
    </div>
  );
}
