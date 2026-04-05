"use client";

import { useState } from "react";
import { AREAS, FORMATS, MAINTEMODES } from "@/lib/constants";
import CheckboxGroup from "./CheckboxGroup";
import DateRangeFilter from "./DateRangeFilter";
import { useFilters } from "./useFilters";
import type { Filters } from "./useFilters";

export default function FilterPanel() {
  const { filters, setFilter, resetFilters, hasActiveFilters } = useFilters();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-200 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-slate-700">
          フィルター
        </h2>
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="text-sm text-slate-500 hover:text-slate-700 sm:hidden"
        >
          {collapsed ? "展開" : "折りたたむ"}
        </button>
      </div>

      <div className={`space-y-4 ${collapsed ? "hidden sm:block" : ""}`}>
        <div>
          <label className="text-sm font-medium text-slate-700 block mb-1">
            フリーテキスト検索
          </label>
          <input
            type="text"
            value={filters.searchText}
            onChange={(e) => setFilter("searchText", e.target.value)}
            placeholder="事業者名、発電所名、要因など..."
            className="w-full sm:w-80 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
            className="text-sm text-blue-600 hover:text-blue-800 underline"
          >
            フィルターをリセット
          </button>
        )}
      </div>
    </div>
  );
}
