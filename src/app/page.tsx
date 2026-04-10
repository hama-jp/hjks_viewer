"use client";

import { useCallback, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { ja } from "date-fns/locale";
import { parseOutageDate } from "@/lib/date-utils";
import { MAINTEMODES, MAINTEMODE_COLORS, AREAS_REVERSE, MAINTEMODES_REVERSE } from "@/lib/constants";
import { useOutageData } from "@/hooks/useOutageData";
import ErrorBoundary from "@/components/common/ErrorBoundary";
import EmptyState from "@/components/common/EmptyState";
import AssortmentTreemap from "@/components/charts/AssortmentTreemap";
import CapacityByAreaChart from "@/components/charts/CapacityByAreaChart";
import OutageTimelineChart from "@/components/charts/OutageTimelineChart";
import KpiCard from "@/components/common/KpiCard";
import ChartCard from "@/components/common/ChartCard";
import { useChartTheme } from "@/hooks/useChartTheme";

const EChartWrapper = dynamic(
  () => import("@/components/charts/EChartWrapper"),
  { ssr: false }
);

function SkeletonChart() {
  return (
    <div className="rounded-xl bg-white dark:bg-slate-800 p-6 shadow-sm border border-slate-200 dark:border-slate-700 animate-pulse">
      <div className="h-4 w-40 bg-slate-200 dark:bg-slate-700 rounded mb-4" />
      <div className="h-[350px] bg-slate-100 dark:bg-slate-700 rounded" />
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { loading, error, records: allRecords, meta, retry: handleRetry } = useOutageData();

  const [nowMs] = useState(() => Date.now());

  const { labelColor, splitLineColor } = useChartTheme();

  const handleAreaChartClick = useCallback(
    (params: { name?: string; seriesName?: string; value?: number }) => {
      const areaCode = params.name ? AREAS_REVERSE[params.name] : undefined;
      const maintemodeCode = params.seriesName ? MAINTEMODES_REVERSE[params.seriesName] : undefined;
      if (!areaCode || !maintemodeCode) return;
      if (params.value === 0) return;
      router.push(`/timeline?areas=${areaCode}&maintemodes=${maintemodeCode}`);
    },
    [router]
  );

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

  // Chart data: outages by area (stacked by maintemode with count labels)
  const areaChartOption = useMemo(() => {
    const areaSet = new Set<string>();
    const areaNameMap: Record<string, string> = {};
    const countMap: Record<string, Record<string, number>> = {};
    for (const r of records) {
      areaSet.add(r.area);
      areaNameMap[r.area] = r.areaName;
      if (!countMap[r.maintemode]) countMap[r.maintemode] = {};
      countMap[r.maintemode][r.area] = (countMap[r.maintemode][r.area] || 0) + 1;
    }
    const areas = Array.from(areaSet).sort((a, b) => parseInt(a) - parseInt(b));
    const areaLabels = areas.map((a) => areaNameMap[a]);
    const maintemodes = Object.keys(MAINTEMODES);

    const series = maintemodes.map((code) => ({
      name: MAINTEMODES[code],
      type: "bar" as const,
      stack: "count",
      data: areas.map((a) => countMap[code]?.[a] ?? 0),
      itemStyle: { color: MAINTEMODE_COLORS[code], cursor: "pointer" as const },
      emphasis: { focus: "series" as const },
      label: {
        show: true,
        position: "inside" as const,
        formatter: (p: unknown) => {
          const v = (p as { value: number }).value;
          return v > 0 ? `${v}` : "";
        },
        fontSize: 11,
        color: "#fff",
      },
    }));

    return {
      tooltip: {
        trigger: "axis" as const,
        axisPointer: { type: "shadow" as const },
        valueFormatter: (value: unknown) => `${value}件`,
      },
      legend: {
        data: maintemodes.map((code) => MAINTEMODES[code]),
        bottom: 0,
        textStyle: { fontSize: 11, color: labelColor },
      },
      xAxis: {
        type: "category" as const,
        data: areaLabels,
        axisLabel: { rotate: 30, fontSize: 11, color: labelColor },
      },
      yAxis: {
        type: "value" as const,
        name: "件数",
        nameTextStyle: { color: labelColor },
        axisLabel: { color: labelColor },
        splitLine: { lineStyle: { color: splitLineColor } },
      },
      series,
      grid: { left: 50, right: 20, bottom: 50, top: 30 },
      color: Object.values(MAINTEMODE_COLORS),
    };
  }, [records, labelColor, splitLineColor]);

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
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">計画外停止及び出力低下</p>
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
          <KpiCard label="停止中件数">
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{records.length}</p>
          </KpiCard>
          <KpiCard label="停止容量合計">
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{(records.reduce((sum, r) => sum + r.downcapacity / 1000, 0)).toFixed(1)}<span className="text-sm font-normal ml-1">MW</span></p>
          </KpiCard>
          <KpiCard label="計画外停止件数">
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">{records.filter(r => r.maintemode === "2").length}</p>
          </KpiCard>
          <KpiCard label="計画外停止容量">
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">{(records.filter(r => r.maintemode === "2").reduce((sum, r) => sum + r.downcapacity / 1000, 0)).toFixed(1)}<span className="text-sm font-normal ml-1">MW</span></p>
          </KpiCard>
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
            <ChartCard
              title="現在の停止状況（計画外停止及び出力低下）"
              action={
                <Link
                  href="/timeline"
                  className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                >
                  定検を含む停止状況・停止計画はこちら &rarr;
                </Link>
              }
            >
              <OutageTimelineChart records={records} maxItems={9999} excludePlanned rangeMonths={3} />
            </ChartCard>

            {/* Row 2: area count + area capacity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChartCard title="エリア別停止件数">
                {records.length > 0 ? (
                  <EChartWrapper option={areaChartOption} ariaLabel="エリア別停止件数の棒グラフ" onEvents={{ click: handleAreaChartClick }} />
                ) : (
                  <EmptyState message="データがありません" />
                )}
              </ChartCard>
              <ChartCard title="エリア別停止容量 (MW)">
                <CapacityByAreaChart records={records} onBarClick={handleAreaChartClick} />
              </ChartCard>
            </div>

            {/* Row 3: assortment treemap (full width) */}
            <ChartCard title="種別内訳">
              <AssortmentTreemap records={records} />
            </ChartCard>
          </>
        )}
      </div>
    </div>
    </ErrorBoundary>
  );
}
