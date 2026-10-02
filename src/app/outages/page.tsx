"use client";

import { Suspense, useMemo } from "react";
import { applyFilters, applySort } from "@/lib/filter-utils";
import { useOutageData } from "@/hooks/useOutageData";
import { useFilters } from "@/components/filters/useFilters";
import { formatGeneratedAt } from "@/lib/date-utils";
import { useTableState } from "@/components/tables/useTableState";
import FilterPanel from "@/components/filters/FilterPanel";
import OutageTable from "@/components/tables/OutageTable";
import Pagination from "@/components/tables/Pagination";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import EmptyState from "@/components/common/EmptyState";

function OutagesContent() {
  const { loading, error, records, meta } = useOutageData();

  const { filters } = useFilters();
  const { sortKey, sortDir, currentPage, pageSize, setSort, setPage } =
    useTableState();

  const filtered = useMemo(
    () => applySort(applyFilters(records, filters), sortKey, sortDir),
    [records, filters, sortKey, sortDir]
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paged = filtered.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
  );

  if (error && records.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <EmptyState
          message="データがありません"
          action={{ label: "再読み込み", onClick: () => window.location.reload() }}
        />
        <p className="text-sm text-slate-500 dark:text-slate-400 text-center mt-2">{error}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <div className="mb-8">
        <p className="eyebrow text-blue-600 dark:text-blue-400">Outages</p>
        <h1 className="mt-1.5 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">停止情報一覧</h1>
        {meta && (
          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
            全{records.length}件
            <span className="mx-1.5 text-slate-300 dark:text-slate-600">·</span>
            最終更新 {formatGeneratedAt(meta.generatedAt)}
          </p>
        )}
      </div>

      <FilterPanel />

      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {loading
            ? "読み込み中..."
            : `${filtered.length}件中 ${(safePage - 1) * pageSize + 1}〜${Math.min(safePage * pageSize, filtered.length)}件を表示`}
        </p>
      </div>

      {loading ? (
        <LoadingSpinner message="読み込み中..." />
      ) : filtered.length === 0 ? (
        <EmptyState message="該当するデータがありません" />
      ) : (
        <OutageTable
          records={paged}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={setSort}
        />
      )}

      <Pagination
        currentPage={safePage}
        totalPages={totalPages}
        onPageChange={setPage}
      />
    </div>
  );
}

function OutagesLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <div className="mb-8 h-8 w-48 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
      <div className="surface-card mb-6 animate-pulse p-5">
        <div className="space-y-3">
          <div className="h-4 w-32 rounded bg-slate-200 dark:bg-slate-800" />
          <div className="h-10 w-80 rounded bg-slate-100 dark:bg-slate-800/60" />
        </div>
      </div>
      <div className="surface-card animate-pulse p-8">
        <div className="space-y-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-6 rounded bg-slate-100 dark:bg-slate-800/60" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function OutagesPage() {
  return (
    <Suspense fallback={<OutagesLoading />}>
      <OutagesContent />
    </Suspense>
  );
}
