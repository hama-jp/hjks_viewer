"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { loadOutagesCurrent } from "@/lib/data-loader";
import type { NormalizedOutage, OutageFile } from "@/types/outage";
import type { EChartsOption } from "echarts";

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

function SkeletonCard() {
  return (
    <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-200 animate-pulse">
      <div className="h-4 w-24 bg-slate-200 rounded mb-3" />
      <div className="h-8 w-16 bg-slate-200 rounded" />
    </div>
  );
}

function SkeletonChart() {
  return (
    <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-200 animate-pulse">
      <div className="h-4 w-40 bg-slate-200 rounded mb-4" />
      <div className="h-[350px] bg-slate-100 rounded" />
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
    setState((prev) => ({ ...prev, loading: true, error: null }));
    loadOutagesCurrent().then((result) => {
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

  const { loading, error, records, meta } = state;

  // Summary stats
  const totalOutages = records.length;
  const unplannedOutages = records.filter((r) => r.maintemode === "2").length;
  const uniqueAreas = new Set(records.map((r) => r.area)).size;

  // Chart data: outages by area
  const areaCountMap: Record<string, number> = {};
  for (const r of records) {
    const label = r.areaName;
    areaCountMap[label] = (areaCountMap[label] || 0) + 1;
  }
  const areaChartOption: EChartsOption = {
    tooltip: { trigger: "axis" },
    xAxis: {
      type: "category",
      data: Object.keys(areaCountMap),
      axisLabel: { rotate: 30, fontSize: 11 },
    },
    yAxis: { type: "value", name: "件数" },
    series: [
      {
        type: "bar",
        data: Object.values(areaCountMap),
        itemStyle: { color: "#3b82f6" },
      },
    ],
    grid: { left: 50, right: 20, bottom: 60, top: 30 },
  };

  // Chart data: outages by format
  const formatCountMap: Record<string, number> = {};
  for (const r of records) {
    const label = r.formatName;
    formatCountMap[label] = (formatCountMap[label] || 0) + 1;
  }
  const formatChartOption: EChartsOption = {
    tooltip: { trigger: "axis" },
    xAxis: {
      type: "category",
      data: Object.keys(formatCountMap),
      axisLabel: { rotate: 30, fontSize: 11 },
    },
    yAxis: { type: "value", name: "件数" },
    series: [
      {
        type: "bar",
        data: Object.values(formatCountMap),
        itemStyle: { color: "#8b5cf6" },
      },
    ],
    grid: { left: 50, right: 20, bottom: 80, top: 30 },
  };

  // Chart data: outages by maintemode (pie)
  const maintemodeCountMap: Record<string, number> = {};
  for (const r of records) {
    const label = r.maintemodeName;
    maintemodeCountMap[label] = (maintemodeCountMap[label] || 0) + 1;
  }
  const pieChartOption: EChartsOption = {
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
        label: { formatter: "{b}\n{c}件 ({d}%)" },
      },
    ],
    color: ["#3b82f6", "#ef4444", "#f59e0b", "#10b981", "#8b5cf6"],
  };

  if (error && records.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="rounded-xl bg-white p-8 shadow-sm border border-slate-200 text-center">
          <p className="text-slate-500 mb-4">データがありません</p>
          <p className="text-sm text-slate-400 mb-6">{error}</p>
          <button
            onClick={handleRetry}
            className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            再読み込み
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">ダッシュボード</h1>
        {meta && (
          <p className="text-sm text-slate-500 mt-1">
            最終更新: {meta.generatedAt} / 取得元: {meta.source}
          </p>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-200">
              <p className="text-sm font-medium text-slate-500">停止中件数</p>
              <p className="mt-2 text-3xl font-bold text-blue-700">
                {totalOutages}
              </p>
            </div>
            <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-200">
              <p className="text-sm font-medium text-slate-500">
                計画外停止件数
              </p>
              <p className="mt-2 text-3xl font-bold text-red-600">
                {unplannedOutages}
              </p>
            </div>
            <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-200">
              <p className="text-sm font-medium text-slate-500">エリア数</p>
              <p className="mt-2 text-3xl font-bold text-emerald-600">
                {uniqueAreas}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {loading ? (
          <>
            <SkeletonChart />
            <SkeletonChart />
            <SkeletonChart />
          </>
        ) : (
          <>
            <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-200">
              <h2 className="text-base font-semibold text-slate-700 mb-4">
                エリア別停止件数
              </h2>
              {records.length > 0 ? (
                <EChartWrapper option={areaChartOption} />
              ) : (
                <p className="text-slate-400 text-sm py-20 text-center">
                  データがありません
                </p>
              )}
            </div>
            <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-200">
              <h2 className="text-base font-semibold text-slate-700 mb-4">
                発電形式別停止件数
              </h2>
              {records.length > 0 ? (
                <EChartWrapper option={formatChartOption} />
              ) : (
                <p className="text-slate-400 text-sm py-20 text-center">
                  データがありません
                </p>
              )}
            </div>
            <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-200 lg:col-span-2">
              <h2 className="text-base font-semibold text-slate-700 mb-4">
                停止区分別件数
              </h2>
              {records.length > 0 ? (
                <EChartWrapper
                  option={pieChartOption}
                  style={{ height: 400 }}
                />
              ) : (
                <p className="text-slate-400 text-sm py-20 text-center">
                  データがありません
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
