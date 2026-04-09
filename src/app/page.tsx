"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { ja } from "date-fns/locale";
import { parseOutageDate } from "@/lib/date-utils";
import { buildBarChartOption } from "@/lib/chart-utils";
import { useOutageData } from "@/hooks/useOutageData";
import ErrorBoundary from "@/components/common/ErrorBoundary";
import EmptyState from "@/components/common/EmptyState";
import type { EChartsOption } from "echarts";
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

  // Chart data: outages by area
  const areaChartOption = useMemo(() => {
    const countMap: Record<string, number> = {};
    for (const r of records) countMap[r.areaName] = (countMap[r.areaName] || 0) + 1;
    return buildBarChartOption({
      items: Object.entries(countMap).map(([label, count]) => ({ label, count })),
      color: "#3b82f6",
      labelColor,
      splitLineColor,
    });
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
          <KpiCard label="停止中件数">
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{records.length}</p>
          </KpiCard>
          <KpiCard label="計画外停止件数">
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">{records.filter(r => r.maintemode === "2").length}</p>
          </KpiCard>
          <KpiCard label="停止容量合計">
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{(records.reduce((sum, r) => sum + r.downcapacity / 1000, 0)).toFixed(1)}<span className="text-sm font-normal ml-1">MW</span></p>
          </KpiCard>
          <KpiCard label="エリア数">
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{new Set(records.map(r => r.area)).size}</p>
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
              title="現在の停止状況（計画停止除く）"
              action={
                <Link
                  href="/timeline"
                  className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                >
                  タイムライン（計画停止を含む）を詳しく見る &rarr;
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

            {/* Row 3: maintemode pie + capacity by area stacked bar */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChartCard title="停止区分別件数">
                {records.length > 0 ? (
                  <EChartWrapper
                    option={pieChartOption}
                    style={{ height: 400 }}
                    ariaLabel="停止区分別件数の円グラフ"
                  />
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
