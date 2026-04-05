"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { loadOutagesCurrent } from "@/lib/data-loader";
import { AREAS, FORMATS, MAINTEMODES } from "@/lib/constants";
import CheckboxGroup from "@/components/filters/CheckboxGroup";
import OutageTimelineChart from "@/components/charts/OutageTimelineChart";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import EmptyState from "@/components/common/EmptyState";
import type { NormalizedOutage, OutageFile } from "@/types/outage";

function parseSet(param: string | null): Set<string> {
  return new Set(param?.split(",").filter(Boolean) ?? []);
}

function TimelineContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [records, setRecords] = useState<NormalizedOutage[]>([]);
  const [meta, setMeta] = useState<OutageFile["meta"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nowMs] = useState(() => Date.now());

  // Parse filters from URL
  const areas = useMemo(
    () => parseSet(searchParams.get("areas")),
    [searchParams]
  );
  const formats = useMemo(
    () => parseSet(searchParams.get("formats")),
    [searchParams]
  );
  const maintemodes = useMemo(
    () => parseSet(searchParams.get("maintemodes")),
    [searchParams]
  );

  const updateParam = useCallback(
    (key: string, value: Set<string>) => {
      const params = new URLSearchParams(searchParams.toString());
      const serialized = [...value].join(",");
      if (serialized) {
        params.set(key, serialized);
      } else {
        params.delete(key);
      }
      router.push(`?${params.toString()}`, { scroll: false });
    },
    [searchParams, router]
  );

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

  // Apply filters
  const filtered = useMemo(() => {
    let data = records;
    if (areas.size > 0) {
      data = data.filter((r) => areas.has(r.area));
    }
    if (formats.size > 0) {
      data = data.filter((r) => formats.has(r.format));
    }
    if (maintemodes.size > 0) {
      data = data.filter((r) => maintemodes.has(r.maintemode));
    }
    return data;
  }, [records, areas, formats, maintemodes]);

  if (error && records.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <EmptyState
          message="データがありません"
          action={{
            label: "再読み込み",
            onClick: () => window.location.reload(),
          }}
        />
        <p className="text-sm text-slate-400 text-center mt-2">{error}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">
          停止タイムライン
        </h1>
        {meta && (
          <p className="text-sm text-slate-500 mt-1">
            最終更新: {meta.generatedAt} / {records.length}件
          </p>
        )}
      </div>

      {/* Filters */}
      <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-200 mb-6">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">
          フィルター
        </h2>
        <div className="space-y-4">
          <CheckboxGroup
            label="エリア"
            options={AREAS}
            selected={areas}
            onChange={(s) => updateParam("areas", s)}
          />
          <CheckboxGroup
            label="発電形式"
            options={FORMATS}
            selected={formats}
            onChange={(s) => updateParam("formats", s)}
          />
          <CheckboxGroup
            label="停止区分"
            options={MAINTEMODES}
            selected={maintemodes}
            onChange={(s) => updateParam("maintemodes", s)}
          />
          {(areas.size > 0 || formats.size > 0 || maintemodes.size > 0) && (
            <button
              onClick={() => router.push("/timeline", { scroll: false })}
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              フィルターをリセット
            </button>
          )}
        </div>
      </div>

      {/* Timeline Chart */}
      <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-200 mb-6">
        <h2 className="text-base font-semibold text-slate-700 mb-4">
          タイムライン（直近40件）
        </h2>
        {loading ? (
          <LoadingSpinner message="読み込み中..." />
        ) : (
          <OutageTimelineChart records={filtered} maxItems={40} />
        )}
      </div>

      {/* Detail Table */}
      {!loading && filtered.length > 0 && (
        <div className="rounded-xl bg-white shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-base font-semibold text-slate-700">
              停止詳細一覧（{filtered.length}件）
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    発電所 / ユニット
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    停止区分
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    停止日時
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    復旧予定
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    停止期間
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    低下量 (MW)
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    停止原因
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[...filtered]
                  .sort((a, b) => {
                    const at = new Date(a.startdt.replace(/\//g, "-")).getTime();
                    const bt = new Date(b.startdt.replace(/\//g, "-")).getTime();
                    return bt - at;
                  })
                  .map((r) => {
                    const startMs = new Date(
                      r.startdt.replace(/\//g, "-")
                    ).getTime();
                    const endMs = r.restartschdt
                      ? new Date(
                          r.restartschdt.replace(/\//g, "-")
                        ).getTime()
                      : nowMs;
                    const diffMs = endMs - startMs;
                    const days = Math.floor(
                      diffMs / (1000 * 60 * 60 * 24)
                    );
                    const hours = Math.floor(
                      (diffMs % (1000 * 60 * 60 * 24)) /
                        (1000 * 60 * 60)
                    );
                    const durationStr = `${days}日${hours}時間`;
                    const ongoing = !r.restartschdt;

                    return (
                      <tr
                        key={r.id}
                        className="hover:bg-slate-50 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-900">
                            {r.name}
                          </div>
                          <div className="text-slate-500 text-xs">
                            {r.unitname} / {r.areaName}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                            style={{
                              backgroundColor:
                                r.maintemode === "1"
                                  ? "#dbeafe"
                                  : r.maintemode === "2"
                                  ? "#fee2e2"
                                  : "#fef3c7",
                              color:
                                r.maintemode === "1"
                                  ? "#1d4ed8"
                                  : r.maintemode === "2"
                                  ? "#b91c1c"
                                  : "#92400e",
                            }}
                          >
                            {r.maintemodeName}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                          {r.startdt}
                        </td>
                        <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                          {r.restartschdt || (
                            <span className="text-amber-600">
                              未定{r.outlook ? `（${r.outlook}）` : ""}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                          {durationStr}
                          {ongoing && (
                            <span className="text-amber-600 text-xs ml-1">
                              (継続中)
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-700 text-right">
                          {(r.downcapacity / 1000).toFixed(1)}
                        </td>
                        <td className="px-4 py-3 text-slate-600 max-w-[200px] truncate">
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
    </div>
  );
}

function TimelineLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="h-8 w-48 bg-slate-200 rounded animate-pulse mb-6" />
      <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-200 mb-6 animate-pulse">
        <div className="space-y-3">
          <div className="h-4 w-32 bg-slate-200 rounded" />
          <div className="h-10 w-80 bg-slate-100 rounded" />
        </div>
      </div>
      <div className="rounded-xl bg-white shadow-sm border border-slate-200 p-8 animate-pulse">
        <div className="h-[400px] bg-slate-100 rounded" />
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
