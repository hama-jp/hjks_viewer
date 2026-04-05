"use client";

import { Suspense, useEffect, useState, useMemo } from "react";
import { loadOutagesCurrent } from "@/lib/data-loader";
import { applyFilters, applySort } from "@/lib/filter-utils";
import { useFilters } from "@/components/filters/useFilters";
import { useTableState } from "@/components/tables/useTableState";
import FilterPanel from "@/components/filters/FilterPanel";
import OutageTable from "@/components/tables/OutageTable";
import Pagination from "@/components/tables/Pagination";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import EmptyState from "@/components/common/EmptyState";
import type { NormalizedOutage, OutageFile } from "@/types/outage";

function OutagesContent() {
  const [records, setRecords] = useState<NormalizedOutage[]>([]);
  const [meta, setMeta] = useState<OutageFile["meta"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { filters } = useFilters();
  const { sortKey, sortDir, currentPage, pageSize, setSort, setPage } =
    useTableState();

  useEffect(() => {
    let cancelled = false;
    loadOutagesCurrent().then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setRecords(result.data);
        setMeta(result.meta ?? null);
      } else {
        setError(result.error);
        setRecords([]);
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

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
        <p className="text-sm text-slate-400 dark:text-slate-500 text-center mt-2">{error}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">停止情報一覧</h1>
        {meta && (
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            最終更新: {meta.generatedAt} / {records.length}件
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
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="h-8 w-48 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mb-6" />
      <div className="rounded-xl bg-white dark:bg-slate-800 p-6 shadow-sm border border-slate-200 dark:border-slate-700 mb-6 animate-pulse">
        <div className="space-y-3">
          <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded" />
          <div className="h-10 w-80 bg-slate-100 dark:bg-slate-600 rounded" />
        </div>
      </div>
      <div className="rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 p-8 animate-pulse">
        <div className="space-y-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-6 bg-slate-100 dark:bg-slate-700 rounded" />
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
