"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { ja } from "date-fns/locale";
import { loadOutagesCurrent, invalidateCache } from "@/lib/data-loader";
import { parseOutageDate } from "@/lib/date-utils";
import ErrorBoundary from "@/components/common/ErrorBoundary";
import EmptyState from "@/components/common/EmptyState";
import type { NormalizedOutage, OutageFile } from "@/types/outage";
import type { EChartsOption } from "echarts";
import AssortmentTreemap from "@/components/charts/AssortmentTreemap";
import CapacityByAreaChart from "@/components/charts/CapacityByAreaChart";
import OutageTimelineChart from "@/components/charts/OutageTimelineChart";
import { useTheme } from "@/components/common/useTheme";

const EChartWrapper = dynamic(
  () => import("@/components/charts/EChartWrapper"),
  { ssr: false }
);

type DashboardState = {
  loading: boolean;
  error: string | null;
  records: NormalizedOutage[];
  meta: OutageFile["meta"] | null;
};

function SkeletonChart() {
  return (
    <div className="rounded-xl bg-white dark:bg-slate-800 p-6 shadow-sm border border-slate-200 dark:border-slate-700 animate-pulse">
      <div className="h-4 w-40 bg-slate-200 dark:bg-slate-700 rounded mb-4" />
      <div className="h-[350px] bg-slate-100 dark:bg-slate-700 rounded" />
    </div>
  );
}

export default function DashboardPage() {
  const [state, setState] = useState<DashboardState>({
    loading: true,
    error: null,
    records: [],
    meta: null,
  });

  const [nowMs] = useState(() => Date.now());
  const mountedRef = useRef(true);
  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadOutagesCurrent().then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setState({
          loading: false,
          error: null,
          records: result.data,
          meta: result.meta ?? null,
        });
      } else {
        setState({ loading: false, error: result.error, records: [], meta: null });
      }
    });
    return () => { cancelled = true; };
  }, []);

  const handleRetry = () => {
    invalidateCache();
    setState((prev) => ({ ...prev, loading: true, error: null }));
    loadOutagesCurrent().then((result) => {
      if (!mountedRef.current) return;
      if (result.ok) {
        setState({
          loading: false,
          error: null,
          records: result.data,
          meta: result.meta ?? null,
        });
      } else {
        setState({ loading: false, error: result.error, records: [], meta: null });
      }
    });
  };

  const theme = useTheme();
  const labelColor = theme === "dark" ? "#f1f5f9" : undefined;
  const splitLineColor = theme === "dark" ? "#334155" : "#e2e8f0";

  const { loading, error, records: allRecords, meta } = state;

  // Filter to currently active outages (started & not yet restarted)
  const records = useMemo(() => {
    return allRecords.filter((r) => {
      const start = parseOutageDate(r.startdt);
      if (start > nowMs) return false;
      if (!r.restartschdt) return true;
      const end = parseOutageDate(r.restartschdt);
      return end > nowMs;
    });
  }, [allRecords, nowMs]);

  // Chart data: outages by area
  const areaChartOption = useMemo<EChartsOption>(() => {
    const areaCountMap: Record<string, number> = {};
    for (const r of records) {
      const label = r.areaName;
      areaCountMap[label] = (areaCountMap[label] || 0) + 1;
    }
    return {
      tooltip: { trigger: "axis" },
      xAxis: {
        type: "category",
        data: Object.keys(areaCountMap),
        axisLabel: { rotate: 30, fontSize: 11, color: labelColor },
        splitLine: { lineStyle: { color: splitLineColor } },
      },
      yAxis: { type: "value", name: "件数", nameTextStyle: { color: labelColor }, axisLabel: { color: labelColor }, splitLine: { lineStyle: { color: splitLineColor } } },
      series: [
        {
          type: "bar",
          data: Object.values(areaCountMap),
          itemStyle: { color: "#3b82f6" },
        },
      ],
      grid: { left: 50, right: 20, bottom: 60, top: 30 },
    };
  }, [records, labelColor, splitLineColor]);

  // Chart data: outages by format
  const formatChartOption = useMemo<EChartsOption>(() => {
    const formatCountMap: Record<string, number> = {};
    for (const r of records) {
      const label = r.formatName;
      formatCountMap[label] = (formatCountMap[label] || 0) + 1;
    }
    return {
      tooltip: { trigger: "axis" },
      xAxis: {
        type: "category",
        data: Object.keys(formatCountMap),
        axisLabel: { rotate: 30, fontSize: 11, color: labelColor },
        splitLine: { lineStyle: { color: splitLineColor } },
      },
      yAxis: { type: "value", name: "件数", nameTextStyle: { color: labelColor }, axisLabel: { color: labelColor }, splitLine: { lineStyle: { color: splitLineColor } } },
      series: [
        {
          type: "bar",
          data: Object.values(formatCountMap),
          itemStyle: { color: "#8b5cf6" },
        },
      ],
      grid: { left: 50, right: 20, bottom: 80, top: 30 },
    };
  }, [records, labelColor, splitLineColor]);

  // Chart data: outages by maintemode (pie)
  const pieChartOption = useMemo<EChartsOption>(() => {
    const maintemodeCountMap: Record<string, number> = {};
    for (const r of records) {
      const label = r.maintemodeName;
      maintemodeCountMap[label] = (maintemodeCountMap[label] || 0) + 1;
    }
    return {
      tooltip: { trigger: "item", formatter: "{b}: {c} ({d}%)" },
      series: [
        {
          type: "pie",
          radius: ["40%", "70%"],
          data: Object.entries(maintemodeCountMap).map(([name, value]) => ({
            name,
            value,
          })),
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: "rgba(0, 0, 0, 0.5)",
            },
          },
          label: { formatter: "{b}\n{c}件 ({d}%)", color: labelColor },
        },
      ],
      color: ["#3b82f6", "#ef4444", "#f59e0b", "#10b981", "#8b5cf6"],
    };
  }, [records, labelColor]);

  if (error && records.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <EmptyState
          message="データがありません"
          action={{ label: "再読み込み", onClick: handleRetry }}
        />
        <p className="text-sm text-slate-400 dark:text-slate-500 text-center mt-2">{error}</p>
      </div>
    );
  }

  return (
    <ErrorBoundary>
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">ダッシュボード</h1>
          {meta && (
            <p className="text-lg font-semibold text-blue-700 dark:text-blue-400">
              {(() => {
                try {
                  return format(parseISO(meta.generatedAt), "yyyy年M月d日 H時 現在", { locale: ja });
                } catch {
                  return meta.generatedAt;
                }
              })()}
            </p>
          )}
        </div>
      </div>

      {/* KPI Summary Cards */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-xl bg-white dark:bg-slate-800 p-4 shadow-sm border border-slate-200 dark:border-slate-700 animate-pulse">
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-20 mb-2" />
              <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-16" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="rounded-xl bg-white dark:bg-slate-800 p-4 shadow-sm border border-slate-200 dark:border-slate-700">
            <p className="text-xs text-slate-500 dark:text-slate-400">停止中件数</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{records.length}</p>
          </div>
          <div className="rounded-xl bg-white dark:bg-slate-800 p-4 shadow-sm border border-slate-200 dark:border-slate-700">
            <p className="text-xs text-slate-500 dark:text-slate-400">計画外停止件数</p>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">{records.filter(r => r.maintemode === "2").length}</p>
          </div>
          <div className="rounded-xl bg-white dark:bg-slate-800 p-4 shadow-sm border border-slate-200 dark:border-slate-700">
            <p className="text-xs text-slate-500 dark:text-slate-400">停止容量合計</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{(records.reduce((sum, r) => sum + r.downcapacity / 1000, 0)).toFixed(1)}<span className="text-sm font-normal ml-1">MW</span></p>
          </div>
          <div className="rounded-xl bg-white dark:bg-slate-800 p-4 shadow-sm border border-slate-200 dark:border-slate-700">
            <p className="text-xs text-slate-500 dark:text-slate-400">エリア数</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{new Set(records.map(r => r.area)).size}</p>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="space-y-6">
        {loading ? (
          <>
            <SkeletonChart />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SkeletonChart />
              <SkeletonChart />
              <SkeletonChart />
              <SkeletonChart />
            </div>
            <SkeletonChart />
          </>
        ) : (
          <>
            {/* Row 1: outage timeline (full width, right below title) */}
            <div className="rounded-xl bg-white dark:bg-slate-800 p-6 shadow-sm border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-slate-700 dark:text-slate-200">
                  現在の停止状況（計画停止除く）
                </h2>
                <Link
                  href="/timeline"
                  className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                >
                  タイムライン（計画停止を含む）を詳しく見る &rarr;
                </Link>
              </div>
              <OutageTimelineChart records={records} maxItems={9999} excludePlanned rangeMonths={3} />
            </div>

            {/* Row 2: area bar + format bar */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="rounded-xl bg-white dark:bg-slate-800 p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                <h2 className="text-base font-semibold text-slate-700 dark:text-slate-200 mb-4">
                  エリア別停止件数
                </h2>
                {records.length > 0 ? (
                  <EChartWrapper option={areaChartOption} ariaLabel="エリア別停止件数の棒グラフ" />
                ) : (
                  <p className="text-slate-400 dark:text-slate-500 text-sm py-20 text-center">
                    データがありません
                  </p>
                )}
              </div>
              <div className="rounded-xl bg-white dark:bg-slate-800 p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                <h2 className="text-base font-semibold text-slate-700 dark:text-slate-200 mb-4">
                  発電形式別停止件数
                </h2>
                {records.length > 0 ? (
                  <EChartWrapper option={formatChartOption} ariaLabel="発電形式別停止件数の棒グラフ" />
                ) : (
                  <p className="text-slate-400 dark:text-slate-500 text-sm py-20 text-center">
                    データがありません
                  </p>
                )}
              </div>
            </div>

            {/* Row 3: maintemode pie + capacity by area stacked bar */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="rounded-xl bg-white dark:bg-slate-800 p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                <h2 className="text-base font-semibold text-slate-700 dark:text-slate-200 mb-4">
                  停止区分別件数
                </h2>
                {records.length > 0 ? (
                  <EChartWrapper
                    option={pieChartOption}
                    style={{ height: 400 }}
                    ariaLabel="停止区分別件数の円グラフ"
                  />
                ) : (
                  <p className="text-slate-400 dark:text-slate-500 text-sm py-20 text-center">
                    データがありません
                  </p>
                )}
              </div>
              <div className="rounded-xl bg-white dark:bg-slate-800 p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                <h2 className="text-base font-semibold text-slate-700 dark:text-slate-200 mb-4">
                  エリア別停止容量 (MW)
                </h2>
                <CapacityByAreaChart records={records} />
              </div>
            </div>

            {/* Row 4: assortment treemap (full width) */}
            <div className="rounded-xl bg-white dark:bg-slate-800 p-6 shadow-sm border border-slate-200 dark:border-slate-700">
              <h2 className="text-base font-semibold text-slate-700 dark:text-slate-200 mb-4">
                種別内訳
              </h2>
              <AssortmentTreemap records={records} />
            </div>
          </>
        )}
      </div>
    </div>
    </ErrorBoundary>
  );
}
