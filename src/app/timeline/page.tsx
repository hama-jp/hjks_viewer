"use client";

import { Suspense, useCallback, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { AREAS, FORMATS, MAINTEMODES, DEFAULT_PAGE_SIZE } from "@/lib/constants";
import { parseSet } from "@/lib/filter-utils";
import { useOutageData } from "@/hooks/useOutageData";
import CheckboxGroup from "@/components/filters/CheckboxGroup";
import OutageTimelineChart from "@/components/charts/OutageTimelineChart";
import Pagination from "@/components/tables/Pagination";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import EmptyState from "@/components/common/EmptyState";

const PAGE_SIZE = DEFAULT_PAGE_SIZE;

import { parseOutageDate, formatGeneratedAt, formatOutageDateLabel, isSentinelDate } from "@/lib/date-utils";

function TimelineContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loading, error, records: allRecords, meta } = useOutageData();

  const [nowMs] = useState(() => Date.now());

  // Parse filters from URL
  const areas = useMemo(() => parseSet(searchParams.get("areas")), [searchParams]);
  const formats = useMemo(() => parseSet(searchParams.get("formats")), [searchParams]);
  const maintemodes = useMemo(() => parseSet(searchParams.get("maintemodes")), [searchParams]);
  const currentPage = parseInt(searchParams.get("page") ?? "1", 10) || 1;

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

  // Filter to active + future planned outages, apply user filters
  const filtered = useMemo(() => {
    const oneYearAhead = nowMs + 365.25 * 24 * 60 * 60 * 1000;
    let data = allRecords.filter((r) => {
      const start = parseOutageDate(r.startdt);
      // 1年以上先に開始する予定は除外
      if (start > oneYearAhead) return false;
      // 復旧予定が過去＝既に復旧済みのため除外（長期停止中の号機は含む）
      if (r.restartschdt && parseOutageDate(r.restartschdt) <= nowMs) return false;
      return true;
    });
    if (areas.size > 0) data = data.filter((r) => areas.has(r.area));
    if (formats.size > 0) data = data.filter((r) => formats.has(r.format));
    if (maintemodes.size > 0) data = data.filter((r) => maintemodes.has(r.maintemode));
    // Sort by area, then startdt
    return data.sort((a, b) => {
      const areaDiff = Number(a.area) - Number(b.area);
      if (areaDiff !== 0) return areaDiff;
      return parseOutageDate(a.startdt) - parseOutageDate(b.startdt);
    });
  }, [allRecords, areas, formats, maintemodes, nowMs]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pageRecords = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const handlePageChange = useCallback(
    (page: number) => updateParams({ page: String(page) }),
    [updateParams]
  );

  if (error && allRecords.length === 0) {
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

  const ongoingCount = filtered.filter((r) => parseOutageDate(r.startdt) <= nowMs).length;
  const plannedCount = filtered.length - ongoingCount;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text)]">
          停止タイムライン
        </h1>
        {meta && (
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
            <span>最終更新: {formatGeneratedAt(meta.generatedAt)}</span>
            <span className="text-subtle">|</span>
            <span>{filtered.length}件</span>
            <span className="inline-flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              停止中 {ongoingCount}件
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
              予定 {plannedCount}件
            </span>
          </p>
        )}
      </div>

      {/* Filters */}
      <div className="card mb-6 p-5 sm:p-6">
        <h2 className="mb-4 text-sm font-semibold text-[var(--text)]">フィルター</h2>
        <div className="space-y-4">
          <CheckboxGroup label="エリア" options={AREAS} selected={areas}
            onChange={(s) => updateParams({ areas: [...s].join(",") || null, page: null })} />
          <CheckboxGroup label="発電形式" options={FORMATS} selected={formats}
            onChange={(s) => updateParams({ formats: [...s].join(",") || null, page: null })} />
          <CheckboxGroup label="停止区分" options={MAINTEMODES} selected={maintemodes}
            onChange={(s) => updateParams({ maintemodes: [...s].join(",") || null, page: null })} />
          {(areas.size > 0 || formats.size > 0 || maintemodes.size > 0) && (
            <button onClick={() => router.push("/timeline", { scroll: false })}
              className="text-sm font-medium text-brand-600 underline decoration-brand-300 underline-offset-2 hover:text-brand-700 dark:text-brand-400">
              フィルターをリセット
            </button>
          )}
        </div>
      </div>

      {/* Pagination controls (top) */}
      {totalPages > 1 && (
        <div className="mb-4">
          <p className="mb-2 text-sm text-muted">
            {filtered.length}件中 {(safePage - 1) * PAGE_SIZE + 1}〜{Math.min(safePage * PAGE_SIZE, filtered.length)}件
          </p>
          <Pagination currentPage={safePage} totalPages={totalPages} onPageChange={handlePageChange} />
        </div>
      )}

      {/* Timeline Chart — current page only */}
      <div className="card mb-6 p-4 sm:p-6">
        {loading ? (
          <LoadingSpinner message="読み込み中..." />
        ) : (
          <OutageTimelineChart records={pageRecords} maxItems={PAGE_SIZE} includeFuture />
        )}
      </div>

      {/* Detail Table — current page only */}
      {!loading && pageRecords.length > 0 && (
        <div className="card overflow-hidden">
          <div className="border-b border-[var(--border)] px-6 py-4">
            <h2 className="text-[15px] font-semibold tracking-tight text-[var(--text)]">
              停止詳細一覧
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[var(--border)] text-sm">
              <thead className="surface-muted">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted">発電所 / ユニット</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted">停止区分</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted">停止日時</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted">復旧予定</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted">停止期間</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted">低下量 (MW)</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted">停止原因</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {pageRecords.map((r) => {
                  const startMs = parseOutageDate(r.startdt);
                  const isFuture = startMs > nowMs;
                  // 番兵日付（未定・長期）は終了日不明として扱う
                  const hasEnd = !!r.restartschdt && !isSentinelDate(r.restartschdt);
                  const endMs = hasEnd ? parseOutageDate(r.restartschdt as string) : nowMs;
                  const diffMs = isFuture && hasEnd ? (endMs - startMs) : endMs - startMs;
                  const days = Math.floor(Math.max(0, diffMs) / (1000 * 60 * 60 * 24));
                  const hours = Math.floor((Math.max(0, diffMs) % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                  const ongoing = !hasEnd && !isFuture;

                  return (
                    <tr key={r.id} className={`transition-colors hover:bg-[var(--surface-muted)] ${isFuture ? "opacity-70" : ""}`}>
                      <td className="px-4 py-3">
                        <div className="font-medium text-[var(--text)]">{r.name}</div>
                        <div className="text-xs text-muted">{r.unitname} / {r.areaName}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            r.maintemode === "1" ? "bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-400" :
                            r.maintemode === "2" ? "bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-400" :
                            "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400"
                          }`}>
                          {r.maintemodeName}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted">{formatOutageDateLabel(r.startdt) ?? "―"}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted">
                        {isSentinelDate(r.restartschdt) || !r.restartschdt ? (
                          <span className="text-amber-600 dark:text-amber-400">未定{r.outlook ? `（${r.outlook}）` : ""}</span>
                        ) : (
                          r.restartschdt
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted">
                        {isFuture ? (
                          hasEnd ? (
                            <span>{days}日{hours}時間<span className="ml-1 text-xs text-brand-600 dark:text-brand-400">(予定)</span></span>
                          ) : (
                            <span className="text-xs text-brand-600 dark:text-brand-400">(未開始)</span>
                          )
                        ) : (
                          <>{days}日{hours}時間{ongoing && <span className="ml-1 text-xs text-amber-600 dark:text-amber-400">(継続中)</span>}</>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-muted">
                        {(r.downcapacity / 1000).toFixed(1)}
                      </td>
                      <td className="max-w-[200px] truncate px-4 py-3 text-muted">
                        {r.factor || "―"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Bottom pagination */}
      <Pagination currentPage={safePage} totalPages={totalPages} onPageChange={handlePageChange} />
    </div>
  );
}

function TimelineLoading() {
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
        <div className="h-[400px] rounded-lg bg-[var(--surface-muted)]" />
      </div>
    </div>
  );
}

export default function TimelinePage() {
  return (
    <Suspense fallback={<TimelineLoading />}>
      <TimelineContent />
    </Suspense>
  );
}
