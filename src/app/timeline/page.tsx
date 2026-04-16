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

import { parseOutageDate } from "@/lib/date-utils";

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
    const twoYearsAgo = nowMs - 2 * 365.25 * 24 * 60 * 60 * 1000;
    const oneYearAhead = nowMs + 365.25 * 24 * 60 * 60 * 1000;
    let data = allRecords.filter((r) => {
      const start = parseOutageDate(r.startdt);
      if (start < twoYearsAgo || start > oneYearAhead) return false;
      // 過去に開始して既に復旧済みのものは除外
      if (start <= nowMs && r.restartschdt && parseOutageDate(r.restartschdt) <= nowMs) return false;
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
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">停止タイムライン</h1>
        {meta && (
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            最終更新: {meta.generatedAt} / {filtered.length}件（停止中 {filtered.filter(r => parseOutageDate(r.startdt) <= nowMs).length}件・予定 {filtered.filter(r => parseOutageDate(r.startdt) > nowMs).length}件）
          </p>
        )}
      </div>

      {/* Filters */}
      <div className="rounded-xl bg-white dark:bg-slate-800 p-6 shadow-sm border border-slate-200 dark:border-slate-700 mb-6">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">フィルター</h2>
        <div className="space-y-4">
          <CheckboxGroup label="エリア" options={AREAS} selected={areas}
            onChange={(s) => updateParams({ areas: [...s].join(",") || null, page: null })} />
          <CheckboxGroup label="発電形式" options={FORMATS} selected={formats}
            onChange={(s) => updateParams({ formats: [...s].join(",") || null, page: null })} />
          <CheckboxGroup label="停止区分" options={MAINTEMODES} selected={maintemodes}
            onChange={(s) => updateParams({ maintemodes: [...s].join(",") || null, page: null })} />
          {(areas.size > 0 || formats.size > 0 || maintemodes.size > 0) && (
            <button onClick={() => router.push("/timeline", { scroll: false })}
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline">
              フィルターをリセット
            </button>
          )}
        </div>
      </div>

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
      <div className="rounded-xl bg-white dark:bg-slate-800 p-3 sm:p-6 shadow-sm border border-slate-200 dark:border-slate-700 mb-6">
        {loading ? (
          <LoadingSpinner message="読み込み中..." />
        ) : (
          <OutageTimelineChart records={pageRecords} maxItems={PAGE_SIZE} includeFuture />
        )}
      </div>

      {/* Detail Table — current page only */}
      {!loading && pageRecords.length > 0 && (
        <div className="rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
            <h2 className="text-base font-semibold text-slate-700 dark:text-slate-200">
              停止詳細一覧
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-sm">
              <thead className="bg-slate-50 dark:bg-slate-700/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-300">発電所 / ユニット</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-300">停止区分</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-300">停止日時</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-300">復旧予定</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-300">停止期間</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-300">低下量 (MW)</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-300">停止原因</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {pageRecords.map((r) => {
                  const startMs = parseOutageDate(r.startdt);
                  const isFuture = startMs > nowMs;
                  const endMs = r.restartschdt ? parseOutageDate(r.restartschdt) : nowMs;
                  const diffMs = isFuture && r.restartschdt ? parseOutageDate(r.restartschdt) - startMs : endMs - startMs;
                  const days = Math.floor(Math.max(0, diffMs) / (1000 * 60 * 60 * 24));
                  const hours = Math.floor((Math.max(0, diffMs) % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                  const ongoing = !r.restartschdt && !isFuture;

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
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300 whitespace-nowrap">{r.startdt}</td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {r.restartschdt || (
                          <span className="text-amber-600">未定{r.outlook ? `（${r.outlook}）` : ""}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {isFuture ? (
                          r.restartschdt ? (
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
        </div>
      )}

      {/* Bottom pagination */}
      <Pagination currentPage={safePage} totalPages={totalPages} onPageChange={handlePageChange} />
    </div>
  );
}

function TimelineLoading() {
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
