"use client";

import { useCallback, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { parseOutageDate, formatGeneratedAt } from "@/lib/date-utils";
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
import { buildTooltipStyle } from "@/lib/chart-utils";

const EChartWrapper = dynamic(
  () => import("@/components/charts/EChartWrapper"),
  { ssr: false }
);

/** ダッシュボードのガントチャートに表示する最大件数（全体はタイムライン参照） */
const DASHBOARD_TIMELINE_LIMIT = 15;

function SkeletonChart() {
  return (
    <div className="card animate-pulse p-6">
      <div className="mb-4 h-4 w-40 rounded bg-[var(--surface-muted)]" />
      <div className="h-[350px] rounded-lg bg-[var(--surface-muted)]" />
    </div>
  );
}

function KpiSkeleton() {
  return (
    <div className="card animate-pulse p-5">
      <div className="h-3 w-20 rounded bg-[var(--surface-muted)]" />
      <div className="mt-3 h-8 w-16 rounded bg-[var(--surface-muted)]" />
    </div>
  );
}

const KPI_ICONS = {
  count: (
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
  ),
  capacity: (
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
  ),
  alert: (
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
  ),
  bolt: (
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
  ),
};

function KpiIcon({ path }: { path: React.ReactNode }) {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      {path}
    </svg>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { loading, error, records: allRecords, meta, retry: handleRetry } = useOutageData();

  const [nowMs] = useState(() => Date.now());

  const { labelColor, splitLineColor, tooltipBackground, tooltipBorder, tooltipText } = useChartTheme();

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
        ...buildTooltipStyle({ tooltipBackground, tooltipBorder, tooltipText }),
      },
      legend: {
        data: maintemodes.map((code) => MAINTEMODES[code]),
        top: 0,
        left: "center",
        itemWidth: 12,
        itemHeight: 12,
        itemGap: 16,
        icon: "roundRect",
        textStyle: { fontSize: 12, color: labelColor },
      },
      xAxis: {
        type: "category" as const,
        data: areaLabels,
        axisLabel: { rotate: 0, fontSize: 11, color: labelColor, triggerEvent: true, interval: 0 },
        triggerEvent: true,
        axisTick: { show: false },
        axisLine: { lineStyle: { color: splitLineColor } },
      },
      yAxis: {
        type: "value" as const,
        name: "件数",
        nameTextStyle: { color: labelColor },
        axisLabel: { color: labelColor },
        splitLine: { lineStyle: { color: splitLineColor } },
      },
      series,
      grid: { left: 50, right: 20, bottom: 30, top: 40 },
      color: Object.values(MAINTEMODE_COLORS),
    };
  }, [records, labelColor, splitLineColor, tooltipBackground, tooltipBorder, tooltipText]);

  if (error && records.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <EmptyState
          message="データがありません"
          action={{ label: "再読み込み", onClick: handleRetry }}
        />
        <p className="mt-2 text-center text-sm text-muted">{error}</p>
      </div>
    );
  }

  return (
    <ErrorBoundary>
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text)]">
            ダッシュボード
          </h1>
          <p className="mt-1 text-sm text-muted">計画外停止及び出力低下の現在の状況</p>
        </div>
        {meta && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-xs font-medium text-muted">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            {formatGeneratedAt(meta.generatedAt)}時点
          </span>
        )}
      </div>

      {/* KPI Summary Cards */}
      {loading ? (
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <KpiSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <KpiCard label="停止中件数" tone="brand" icon={<KpiIcon path={KPI_ICONS.count} />}>
            <p className="text-2xl font-bold tracking-tight text-[var(--text)]">
              {records.length}
              <span className="ml-1 text-sm font-normal text-muted">件</span>
            </p>
          </KpiCard>
          <KpiCard label="停止容量合計" tone="default" icon={<KpiIcon path={KPI_ICONS.bolt} />}>
            <p className="text-2xl font-bold tracking-tight text-[var(--text)]">
              {(records.reduce((sum, r) => sum + r.downcapacity / 1000, 0)).toFixed(1)}
              <span className="ml-1 text-sm font-normal text-muted">MW</span>
            </p>
          </KpiCard>
          <KpiCard label="計画外停止件数" tone="danger" icon={<KpiIcon path={KPI_ICONS.alert} />}>
            <p className="text-2xl font-bold tracking-tight text-red-600 dark:text-red-400">
              {records.filter((r) => r.maintemode === "2").length}
              <span className="ml-1 text-sm font-normal text-muted">件</span>
            </p>
          </KpiCard>
          <KpiCard label="計画外停止容量" tone="danger" icon={<KpiIcon path={KPI_ICONS.bolt} />}>
            <p className="text-2xl font-bold tracking-tight text-red-600 dark:text-red-400">
              {(records.filter((r) => r.maintemode === "2").reduce((sum, r) => sum + r.downcapacity / 1000, 0)).toFixed(1)}
              <span className="ml-1 text-sm font-normal text-muted">MW</span>
            </p>
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
              title="現在の停止状況"
              description={`計画外停止及び出力低下（直近${Math.min(records.length, DASHBOARD_TIMELINE_LIMIT)}件。全体はタイムラインで確認）`}
              action={
                <Link
                  href="/timeline"
                  className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 transition-colors hover:text-brand-700 dark:text-brand-400"
                >
                  定検を含む停止計画
                  <span aria-hidden="true">&rarr;</span>
                </Link>
              }
            >
              <OutageTimelineChart records={records} maxItems={DASHBOARD_TIMELINE_LIMIT} excludePlanned rangeMonths={3} />
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
