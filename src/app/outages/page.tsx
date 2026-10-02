"use client";

import { Suspense, useMemo } from "react";
import { applyFilters, applySort } from "@/lib/filter-utils";
import { formatGeneratedAt } from "@/lib/date-utils";
import { useOutageData } from "@/hooks/useOutageData";
import { useFilters } from "@/components/filters/useFilters";
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
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <EmptyState
          message="データがありません"
          action={{ label: "再読み込み", onClick: () => window.location.reload() }}
        />
        <p className="mt-2 text-center text-sm text-muted">{error}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text)]">
          停止情報一覧
        </h1>
        {meta && (
          <p className="mt-1 text-sm text-muted">
            最終更新: {formatGeneratedAt(meta.generatedAt)} / {records.length}件
          </p>
        )}
      </div>

      <FilterPanel />

      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-muted">
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
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 h-8 w-48 animate-pulse rounded bg-[var(--surface-muted)]" />
      <div className="card mb-6 animate-pulse p-6">
        <div className="space-y-3">
          <div className="h-4 w-32 rounded bg-[var(--surface-muted)]" />
          <div className="h-10 w-80 rounded bg-[var(--surface-muted)]" />
        </div>
      </div>
      <div className="card animate-pulse p-8">
        <div className="space-y-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-6 rounded bg-[var(--surface-muted)]" />
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
