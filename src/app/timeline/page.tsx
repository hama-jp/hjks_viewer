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

import {
  parseOutageDate,
  formatGeneratedAt,
  formatOutageDateLabel,
  isUndeterminedDate,
} from "@/lib/date-utils";

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
        <p className="eyebrow text-blue-600 dark:text-blue-400">Timeline</p>
        <h1 className="mt-1.5 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">停止タイムライン</h1>
        {meta && (
          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
            {filtered.length}件（停止中 {filtered.filter(r => parseOutageDate(r.startdt) <= nowMs).length}件・予定 {filtered.filter(r => parseOutageDate(r.startdt) > nowMs).length}件）
            <span className="mx-1.5 text-slate-300 dark:text-slate-600">·</span>
            最終更新 {formatGeneratedAt(meta.generatedAt)}
          </p>
        )}
      </div>

      {/* Filters */}
      <section className="surface-card mb-6 p-5">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-sm font-semibold tracking-tight text-slate-800 dark:text-slate-100">
            フィルター
          </h2>
          {(areas.size > 0 || formats.size > 0 || maintemodes.size > 0) && (
            <button
              onClick={() => router.push("/timeline", { scroll: false })}
              className="text-xs font-medium text-blue-600 transition-colors hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              フィルターをリセット
            </button>
          )}
        </div>
        <div className="space-y-4">
          <CheckboxGroup label="エリア" options={AREAS} selected={areas}
            onChange={(s) => updateParams({ areas: [...s].join(",") || null, page: null })} />
          <CheckboxGroup label="発電形式" options={FORMATS} selected={formats}
            onChange={(s) => updateParams({ formats: [...s].join(",") || null, page: null })} />
          <CheckboxGroup label="停止区分" options={MAINTEMODES} selected={maintemodes}
            onChange={(s) => updateParams({ maintemodes: [...s].join(",") || null, page: null })} />
        </div>
      </section>

      {/* Pagination controls (top) */}
      {totalPages > 1 && (
        <div className="mb-4">
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">
            {filtered.length}件中 {(safePage - 1) * PAGE_SIZE + 1}〜{Math.min(safePage * PAGE_SIZE, filtered.length)}件
          </p>
          <Pagination currentPage={safePage} totalPages={totalPages} onPageChange={handlePageChange} />
        </div>
      )}

      {/* Timeline Chart — current page only */}
      <section className="surface-card mb-6 p-4 sm:p-5">
        {loading ? (
          <LoadingSpinner message="読み込み中..." />
        ) : (
          <OutageTimelineChart records={pageRecords} maxItems={PAGE_SIZE} includeFuture />
        )}
      </section>

      {/* Detail Table — current page only */}
      {!loading && pageRecords.length > 0 && (
        <section className="surface-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
            <h2 className="text-sm font-semibold tracking-tight text-slate-800 dark:text-slate-100">
              停止詳細一覧
            </h2>
            <span className="text-xs tabular-nums text-slate-400 dark:text-slate-500">
              {pageRecords.length}件
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm dark:divide-slate-800">
              <thead className="bg-slate-50/80 dark:bg-slate-800/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">発電所 / ユニット</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">停止区分</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">停止日時</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">復旧予定</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">停止期間</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">低下量 (MW)</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">停止原因</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {pageRecords.map((r) => {
                  const startMs = parseOutageDate(r.startdt);
                  const isFuture = startMs > nowMs;
                  const restartMs =
                    r.restartschdt && !isUndeterminedDate(r.restartschdt)
                      ? parseOutageDate(r.restartschdt)
                      : null;
                  const endMs = restartMs ?? nowMs;
                  const diffMs = isFuture && restartMs ? restartMs - startMs : endMs - startMs;
                  const days = Math.floor(Math.max(0, diffMs) / (1000 * 60 * 60 * 24));
                  const hours = Math.floor((Math.max(0, diffMs) % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                  const ongoing = !restartMs && !isFuture;

                  return (
                    <tr key={r.id} className={`hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${isFuture ? "opacity-70" : ""}`}>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900 dark:text-slate-100">{r.name}</div>
                        <div className="text-slate-500 dark:text-slate-400 text-xs">{r.unitname} / {r.areaName}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            r.maintemode === "1" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300" :
                            r.maintemode === "2" ? "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300" :
                            "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300"
                          }`}>
                          {r.maintemodeName}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap tabular-nums text-slate-700 dark:text-slate-300">
                        {formatOutageDateLabel(r.startdt)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap tabular-nums text-slate-700 dark:text-slate-300">
                        {restartMs === null ? (
                          <span className="text-amber-600">未定{r.outlook ? `（${r.outlook}）` : ""}</span>
                        ) : (
                          formatOutageDateLabel(r.restartschdt)
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {isFuture ? (
                          restartMs ? (
                            <span>{days}日{hours}時間<span className="text-blue-600 dark:text-blue-400 text-xs ml-1">(予定)</span></span>
                          ) : (
                            <span className="text-blue-600 dark:text-blue-400 text-xs">(未開始)</span>
                          )
                        ) : (
                          <>{days}日{hours}時間{ongoing && <span className="text-amber-600 text-xs ml-1">(継続中)</span>}</>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300 text-right">
                        {(r.downcapacity / 1000).toFixed(1)}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400 max-w-[200px] truncate">
                        {r.factor || "―"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Bottom pagination */}
      <Pagination currentPage={safePage} totalPages={totalPages} onPageChange={handlePageChange} />
    </div>
  );
}

function TimelineLoading() {
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
        <div className="h-[400px] bg-slate-100 dark:bg-slate-700 rounded" />
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
