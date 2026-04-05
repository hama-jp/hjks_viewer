"use client";

import dynamic from "next/dynamic";
import type { EChartsOption } from "echarts";
import type { NormalizedOutage } from "@/types/outage";
import { MAINTEMODES } from "@/lib/constants";

const EChartWrapper = dynamic(
  () => import("@/components/charts/EChartWrapper"),
  { ssr: false }
);

const MAINTEMODE_COLORS: Record<string, string> = {
  "1": "#3b82f6", // 計画停止 - blue
  "2": "#ef4444", // 計画外停止 - red
  "3": "#f59e0b", // 出力低下 - amber
};

type Props = {
  records: NormalizedOutage[];
};

function parseMonth(startdt: string): string {
  // startdt format: "YYYY/MM/DD HH:mm"
  const parts = startdt.split("/");
  if (parts.length < 2) return "不明";
  return `${parts[0]}-${parts[1]}`;
}

export default function MonthlyTrendChart({ records }: Props) {
  if (records.length === 0) {
    return (
      <p className="text-slate-400 text-sm py-20 text-center">
        データがありません
      </p>
    );
  }

  // Current month as upper bound (e.g. "2026-04")
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  // Collect all months and maintemodes, excluding future months
  const monthSet = new Set<string>();
  const countMap: Record<string, Record<string, number>> = {};

  for (const r of records) {
    const month = parseMonth(r.startdt);
    if (month > currentMonth) continue;
    monthSet.add(month);
    if (!countMap[r.maintemode]) countMap[r.maintemode] = {};
    countMap[r.maintemode][month] = (countMap[r.maintemode][month] || 0) + 1;
  }

  const months = Array.from(monthSet).sort();
  const maintemodes = Object.keys(MAINTEMODES);

  const series = maintemodes.map((code) => ({
    name: MAINTEMODES[code],
    type: "line" as const,
    data: months.map((m) => countMap[code]?.[m] ?? 0),
    smooth: true,
    symbol: "circle",
    symbolSize: 8,
    lineStyle: { width: 2.5 },
    itemStyle: { color: MAINTEMODE_COLORS[code] },
  }));

  const option: EChartsOption = {
    tooltip: {
      trigger: "axis",
    },
    legend: {
      data: maintemodes.map((code) => MAINTEMODES[code]),
      bottom: 0,
      textStyle: { fontSize: 11 },
    },
    xAxis: {
      type: "category",
      data: months,
      axisLabel: { fontSize: 11 },
      boundaryGap: false,
    },
    yAxis: {
      type: "value",
      name: "件数",
      minInterval: 1,
    },
    series,
    grid: { left: 50, right: 20, bottom: 50, top: 20 },
    color: Object.values(MAINTEMODE_COLORS),
  };

  return <EChartWrapper option={option} style={{ height: 350 }} />;
}
