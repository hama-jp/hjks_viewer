"use client";

import dynamic from "next/dynamic";
import type { EChartsOption } from "echarts";
import type { NormalizedOutage } from "@/types/outage";
import { MAINTEMODES, MAINTEMODE_COLORS } from "@/lib/constants";
import { useChartTheme } from "@/hooks/useChartTheme";

const EChartWrapper = dynamic(
  () => import("@/components/charts/EChartWrapper"),
  { ssr: false }
);

type Props = {
  records: NormalizedOutage[];
  onBarClick?: (params: { name?: string; seriesName?: string; value?: number }) => void;
};

export default function CapacityByAreaChart({ records, onBarClick }: Props) {
  const { labelColor, splitLineColor } = useChartTheme();

  if (records.length === 0) {
    return (
      <p className="text-slate-400 dark:text-slate-500 text-sm py-20 text-center">
        データがありません
      </p>
    );
  }

  // Aggregate downcapacity (kW → MW) by area × maintemode
  const areaSet = new Set<string>();
  const areaNameMap: Record<string, string> = {};
  const capacityMap: Record<string, Record<string, number>> = {};

  for (const r of records) {
    areaSet.add(r.area);
    areaNameMap[r.area] = r.areaName;
    if (!capacityMap[r.maintemode]) capacityMap[r.maintemode] = {};
    capacityMap[r.maintemode][r.area] =
      (capacityMap[r.maintemode][r.area] || 0) + r.downcapacity / 1000;
  }

  const areas = Array.from(areaSet).sort((a, b) => parseInt(a) - parseInt(b));
  const areaLabels = areas.map((a) => areaNameMap[a]);
  const maintemodes = Object.keys(MAINTEMODES);

  const series = maintemodes.map((code) => ({
    name: MAINTEMODES[code],
    type: "bar" as const,
    stack: "capacity",
    data: areas.map((a) => Math.round(capacityMap[code]?.[a] ?? 0)),
    itemStyle: { color: MAINTEMODE_COLORS[code], cursor: onBarClick ? "pointer" as const : "default" as const },
    emphasis: { focus: "series" as const },
  }));

  const option: EChartsOption = {
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      valueFormatter: (value: unknown) => `${value} MW`,
    },
    legend: {
      data: maintemodes.map((code) => MAINTEMODES[code]),
      bottom: 0,
      textStyle: { fontSize: 11, color: labelColor },
    },
    xAxis: {
      type: "category",
      data: areaLabels,
      axisLabel: { rotate: 30, fontSize: 11, color: labelColor },
      splitLine: { lineStyle: { color: splitLineColor } },
    },
    yAxis: {
      type: "value",
      name: "MW",
      nameTextStyle: { color: labelColor },
      axisLabel: { color: labelColor },
      splitLine: { lineStyle: { color: splitLineColor } },
    },
    series,
    grid: { left: 60, right: 20, bottom: 50, top: 20 },
    color: Object.values(MAINTEMODE_COLORS),
  };

  return <EChartWrapper option={option} style={{ height: 350 }} ariaLabel="エリア別停止容量の積み上げ棒グラフ" onEvents={onBarClick ? { click: onBarClick } : undefined} />;
}
