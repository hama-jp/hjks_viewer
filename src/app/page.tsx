"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { ja } from "date-fns/locale";
import { parseOutageDate } from "@/lib/date-utils";
import { buildBarChartOption } from "@/lib/chart-utils";
import { MAINTEMODES, MAINTEMODE_COLORS } from "@/lib/constants";
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
  const { loading, error, records: allRecords, meta, retry: handleRetry } = useOutageData();

  const [nowMs] = useState(() => Date.now());

  const { labelColor, splitLineColor } = useChartTheme();

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
      itemStyle: { color: MAINTEMODE_COLORS[code] },
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

  // Chart data: outages by format
  const formatChartOption = useMemo(() => {
    const countMap: Record<string, number> = {};
    for (const r of records) countMap[r.formatName] = (countMap[r.formatName] || 0) + 1;
    return buildBarChartOption({
      items: Object.entries(countMap).map(([label, count]) => ({ label, count })),
      color: "#8b5cf6",
      labelColor,
      splitLineColor,
      gridBottom: 80,
    });
  }, [records, labelColor, splitLineColor]);

  // 長期停止Top5
  const longOutageTop5 = useMemo(() => {
    return records
      .map((r) => {
        const startMs = parseOutageDate(r.startdt);
        const durationDays = Math.floor((nowMs - startMs) / (1000 * 60 * 60 * 24));
        return {
          name: r.name,
          unitname: r.unitname,
          areaName: r.areaName,
          maintemodeName: r.maintemodeName,
          downcapacityMW: Math.round(r.downcapacity / 1000),
          startdt: r.startdt,
          durationDays,
        };
      })
      .sort((a, b) => b.durationDays - a.durationDays)
      .slice(0, 5);
  }, [records, nowMs]);

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

            {/* Row 2: area bar + format bar */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChartCard title="エリア別停止件数">
                {records.length > 0 ? (
                  <EChartWrapper option={areaChartOption} ariaLabel="エリア別停止件数の棒グラフ" />
                ) : (
                  <EmptyState message="データがありません" />
                )}
              </ChartCard>
              <ChartCard title="発電形式別停止件数">
                {records.length > 0 ? (
                  <EChartWrapper option={formatChartOption} ariaLabel="発電形式別停止件数の棒グラフ" />
                ) : (
                  <EmptyState message="データがありません" />
                )}
              </ChartCard>
            </div>

            {/* Row 3: long outage top5 + capacity by area */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChartCard title="長期停止 Top 5">
                {longOutageTop5.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-700 text-left">
                          <th className="py-2 pr-2 font-medium text-slate-500 dark:text-slate-400">#</th>
                          <th className="py-2 pr-2 font-medium text-slate-500 dark:text-slate-400">発電所</th>
                          <th className="py-2 pr-2 font-medium text-slate-500 dark:text-slate-400">区分</th>
                          <th className="py-2 pr-2 font-medium text-slate-500 dark:text-slate-400 text-right">MW</th>
                          <th className="py-2 font-medium text-slate-500 dark:text-slate-400 text-right">停止日数</th>
                        </tr>
                      </thead>
                      <tbody>
                        {longOutageTop5.map((item, i) => (
                          <tr key={i} className="border-b border-slate-100 dark:border-slate-700/50">
                            <td className="py-2 pr-2 text-slate-400 dark:text-slate-500">{i + 1}</td>
                            <td className="py-2 pr-2 text-slate-900 dark:text-slate-100">
                              {item.name}
                              <span className="text-xs text-slate-400 dark:text-slate-500 ml-1">{item.unitname}</span>
                              <div className="text-xs text-slate-400 dark:text-slate-500">{item.areaName}</div>
                            </td>
                            <td className="py-2 pr-2">
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                item.maintemodeName === "計画外停止" ? "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300" :
                                item.maintemodeName === "出力低下" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300" :
                                "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
                              }`}>
                                {item.maintemodeName}
                              </span>
                            </td>
                            <td className="py-2 pr-2 text-right text-slate-900 dark:text-slate-100">{item.downcapacityMW}</td>
                            <td className="py-2 text-right font-semibold text-slate-900 dark:text-slate-100">
                              {item.durationDays}
                              <span className="text-xs font-normal text-slate-400 ml-0.5">日</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <EmptyState message="データがありません" />
                )}
              </ChartCard>
              <ChartCard title="エリア別停止容量 (MW)">
                <CapacityByAreaChart records={records} />
              </ChartCard>
            </div>

            {/* Row 4: assortment treemap (full width) */}
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
