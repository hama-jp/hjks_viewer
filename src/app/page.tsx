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

/** Number of rows shown in the dashboard gantt (full list lives on /timeline). */
const DASHBOARD_TIMELINE_ITEMS = 12;

function BoltOffIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M8.5 2 4 11h5l-.7 4.5M13 2l-2.2 4.5M22 22 2 2" />
      <path d="M9.9 15h4.1l-1 7 7-9h-5l1.6-5.4" />
    </svg>
  );
}

function GaugeIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
      <path d="m13.4 12.6 4.1-4.1" />
      <path d="M20.3 18a9 9 0 1 0-16.6 0" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9v4M12 17h.01" />
    </svg>
  );
}

function SkeletonChart() {
  return (
    <div className="surface-card animate-pulse p-5">
      <div className="mb-4 h-4 w-40 rounded bg-slate-200 dark:bg-slate-800" />
      <div className="h-[350px] rounded-xl bg-slate-100 dark:bg-slate-800/60" />
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { loading, error, records: allRecords, meta, retry: handleRetry } = useOutageData();

  const [nowMs] = useState(() => Date.now());

  const { axisLabelColor, splitLineColor } = useChartTheme();

  const handleAreaChartClick = useCallback(
    (params: { componentType?: string; name?: string; seriesName?: string; value?: string | number }) => {
      // X-axis label click → navigate with area filter only (all maintemodes)
      if (params.componentType === "xAxis") {
        const areaCode = params.value ? AREAS_REVERSE[String(params.value)] : undefined;
        if (!areaCode) return;
        router.push(`/timeline?areas=${areaCode}`);
        return;
      }
      // Bar segment click → navigate with area + maintemode
      const areaCode = params.name ? AREAS_REVERSE[params.name] : undefined;
      const maintemodeCode = params.seriesName ? MAINTEMODES_REVERSE[params.seriesName] : undefined;
      if (!areaCode || !maintemodeCode) return;
      if (params.value === 0) return;
      router.push(`/timeline?areas=${areaCode}&maintemodes=${maintemodeCode}`);
    },
    [router]
  );

  // 本日時点で実際に停止しているもののみカウントする。
  // 将来の定期点検の停止予定などは、実際に停止が開始されるまで除外する。
  const records = useMemo(() => {
    return allRecords.filter((r) => {
      const start = parseOutageDate(r.startdt);
      // 停止開始日が未来のものは除外（定期検査の停止予定など）
      if (start > nowMs) return false;
      // 復旧予定日がなければ現在も停止中
      if (!r.restartschdt) return true;
      // 復旧予定日を過ぎていれば復旧済みとして除外
      const end = parseOutageDate(r.restartschdt);
      return end > nowMs;
    });
  }, [allRecords, nowMs]);

  const unplanned = useMemo(() => records.filter((r) => r.maintemode === "2"), [records]);
  const totalDownMw = useMemo(
    () => records.reduce((sum, r) => sum + r.downcapacity / 1000, 0),
    [records]
  );
  const unplannedDownMw = useMemo(
    () => unplanned.reduce((sum, r) => sum + r.downcapacity / 1000, 0),
    [unplanned]
  );

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
      barMaxWidth: 36,
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
        fontWeight: "bold" as const,
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
        itemWidth: 10,
        itemHeight: 10,
        icon: "roundRect",
        textStyle: { fontSize: 11, color: axisLabelColor },
      },
      xAxis: {
        type: "category" as const,
        data: areaLabels,
        axisTick: { show: false },
        axisLine: { lineStyle: { color: splitLineColor } },
        axisLabel: { rotate: 30, fontSize: 11, color: axisLabelColor, triggerEvent: true },
        triggerEvent: true,
      },
      yAxis: {
        type: "value" as const,
        name: "件数",
        nameTextStyle: { color: axisLabelColor },
        axisLabel: { color: axisLabelColor },
        splitLine: { lineStyle: { color: splitLineColor } },
      },
      series,
      grid: { left: 50, right: 20, bottom: 50, top: 30 },
      color: Object.values(MAINTEMODE_COLORS),
    };
  }, [records, axisLabelColor, splitLineColor]);

  if (error && records.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <EmptyState
          message="データがありません"
          action={{ label: "再読み込み", onClick: handleRetry }}
        />
        <p className="mt-2 text-center text-sm text-slate-500 dark:text-slate-400">{error}</p>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        {/* Page header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow text-blue-600 dark:text-blue-400">Live overview</p>
            <h1 className="mt-1.5 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              ダッシュボード
            </h1>
            <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
              計画外停止および出力低下の現在の状況をまとめて表示します。
            </p>
          </div>
          {meta && (
            <div className="inline-flex items-center gap-2 self-start rounded-full border border-slate-200/80 bg-white px-3 py-1.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <span className="text-xs font-medium tabular-nums text-slate-600 dark:text-slate-300">
                {(() => {
                  try {
                    return format(parseISO(meta.generatedAt), "yyyy年M月d日 H時", { locale: ja });
                  } catch {
                    return meta.generatedAt;
                  }
                })()}
                <span className="ml-1 text-slate-400 dark:text-slate-500">現在</span>
              </span>
            </div>
          )}
        </div>

        {/* KPI Summary Cards */}
        {loading ? (
          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="surface-card animate-pulse p-5">
                <div className="mb-3 h-3 w-20 rounded bg-slate-200 dark:bg-slate-800" />
                <div className="h-8 w-20 rounded bg-slate-200 dark:bg-slate-800" />
              </div>
            ))}
          </div>
        ) : (
          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KpiCard
              label="停止中件数"
              value={records.length}
              unit="件"
              tone="blue"
              icon={<BoltOffIcon />}
            />
            <KpiCard
              label="停止容量合計"
              value={totalDownMw.toFixed(1)}
              unit="MW"
              tone="slate"
              icon={<GaugeIcon />}
            />
            <KpiCard
              label="計画外停止件数"
              value={unplanned.length}
              unit="件"
              tone="red"
              icon={<AlertIcon />}
            />
            <KpiCard
              label="計画外停止容量"
              value={unplannedDownMw.toFixed(1)}
              unit="MW"
              tone="amber"
              icon={<AlertIcon />}
            />
          </div>
        )}

        {/* Charts */}
        <div className="space-y-6">
          {loading ? (
            <>
              <SkeletonChart />
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <SkeletonChart />
                <SkeletonChart />
              </div>
              <SkeletonChart />
            </>
          ) : (
            <>
              {/* Row 1: outage timeline (full width) */}
              <ChartCard
                title="現在の停止状況"
                description="計画外停止および出力低下（復旧予定を含む）"
                action={
                  <Link
                    href="/timeline"
                    className="group inline-flex items-center gap-1 text-xs font-medium text-blue-600 transition-colors hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    定検を含む停止計画を見る
                    <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">
                      &rarr;
                    </span>
                  </Link>
                }
              >
                <OutageTimelineChart
                  records={records}
                  maxItems={DASHBOARD_TIMELINE_ITEMS}
                  excludePlanned
                  rangeMonths={3}
                />
              </ChartCard>

              {/* Row 2: area count + area capacity */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <ChartCard title="エリア別停止件数" description="停止区分ごとの積み上げ">
                  {records.length > 0 ? (
                    <EChartWrapper option={areaChartOption} ariaLabel="エリア別停止件数の棒グラフ" onEvents={{ click: handleAreaChartClick }} />
                  ) : (
                    <EmptyState message="データがありません" />
                  )}
                </ChartCard>
                <ChartCard title="エリア別停止容量 (MW)" description="停止区分ごとの積み上げ">
                  <CapacityByAreaChart records={records} onBarClick={handleAreaChartClick} />
                </ChartCard>
              </div>

              {/* Row 3: assortment treemap (full width) */}
              <ChartCard title="種別内訳" description="停止・出力低下の要因別構成">
                <AssortmentTreemap records={records} />
              </ChartCard>
            </>
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
}