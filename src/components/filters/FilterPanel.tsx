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
    <section className="surface-card mb-6 p-5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold tracking-tight text-slate-800 dark:text-slate-100">
            フィルター
          </h2>
          {activeFilterCount > 0 && (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1.5 text-[11px] font-semibold text-white">
              {activeFilterCount}
            </span>
          )}
        </div>
        <button
          onClick={() => setUserCollapsed((v) => !(v ?? isMobile))}
          aria-expanded={!collapsed}
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        >
          {collapsed ? "展開" : "折りたたむ"}
          <svg
            className={`h-3.5 w-3.5 transition-transform ${collapsed ? "" : "rotate-180"}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
      </div>

      <div className={`mt-5 space-y-5 ${collapsed ? "hidden" : ""}`}>
        <div>
          <label className="eyebrow mb-2 block">フリーテキスト検索</label>
          <div className="relative w-full sm:w-80">
            <svg
              className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="事業者名、発電所名、要因など..."
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pr-3 pl-9 text-sm text-slate-900 transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </div>
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
            className="text-xs font-medium text-blue-600 transition-colors hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            フィルターをリセット
          </button>
        )}
      </div>
    </section>
  );
}
