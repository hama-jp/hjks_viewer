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
};

export default function CapacityByAreaChart({ records }: Props) {
  const { labelColor, splitLineColor } = useChartTheme();

  if (records.length === 0) {
    return (
      <p className="text-slate-400 dark:text-slate-500 text-sm py-20 text-center">
        データがありません
      </p>
    );
  }

  // Aggregate downcapacity (kW → MW) and count by area × maintemode
  const areaSet = new Set<string>();
  const areaNameMap: Record<string, string> = {};
  const capacityMap: Record<string, Record<string, number>> = {};
  const countMap: Record<string, Record<string, number>> = {};

  for (const r of records) {
    areaSet.add(r.area);
    areaNameMap[r.area] = r.areaName;
    if (!capacityMap[r.maintemode]) capacityMap[r.maintemode] = {};
    capacityMap[r.maintemode][r.area] =
      (capacityMap[r.maintemode][r.area] || 0) + r.downcapacity / 1000;
    if (!countMap[r.maintemode]) countMap[r.maintemode] = {};
    countMap[r.maintemode][r.area] = (countMap[r.maintemode][r.area] || 0) + 1;
  }

  const areas = Array.from(areaSet).sort((a, b) => parseInt(a) - parseInt(b));
  const areaLabels = areas.map((a) => areaNameMap[a]);
  const maintemodes = Object.keys(MAINTEMODES);

  const barSeries = maintemodes.map((code) => ({
    name: MAINTEMODES[code],
    type: "bar" as const,
    stack: "capacity",
    yAxisIndex: 0,
    data: areas.map((a) => Math.round(capacityMap[code]?.[a] ?? 0)),
    itemStyle: { color: MAINTEMODE_COLORS[code] },
    emphasis: { focus: "series" as const },
  }));

  // エリアごとの合計件数（折れ線用）
  const countByArea = areas.map((a) =>
    maintemodes.reduce((sum, code) => sum + (countMap[code]?.[a] ?? 0), 0)
  );

  const countSeries = {
    name: "件数",
    type: "line" as const,
    yAxisIndex: 1,
    data: countByArea,
    symbol: "circle" as const,
    symbolSize: 8,
    lineStyle: { width: 2, color: "#6366f1" },
    itemStyle: { color: "#6366f1" },
    label: {
      show: true,
      position: "top" as const,
      formatter: "{c}件",
      fontSize: 11,
      color: labelColor,
    },
  };

  const series = [...barSeries, countSeries];

  const option: EChartsOption = {
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      formatter: (params: unknown) => {
        const items = params as { seriesName: string; value: number; color: string; seriesType: string }[];
        if (!Array.isArray(items) || items.length === 0) return "";
        const header = `<strong>${(params as { name: string }[])[0]?.name ?? ""}</strong>`;
        const lines = items.map((item) => {
          const dot = `<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${item.color};margin-right:4px"></span>`;
          const unit = item.seriesType === "line" ? "件" : " MW";
          return `${dot}${item.seriesName}: ${item.value}${unit}`;
        });
        return [header, ...lines].join("<br/>");
      },
    },
    legend: {
      data: [...maintemodes.map((code) => MAINTEMODES[code]), "件数"],
      bottom: 0,
      textStyle: { fontSize: 11, color: labelColor },
    },
    xAxis: {
      type: "category",
      data: areaLabels,
      axisLabel: { rotate: 30, fontSize: 11, color: labelColor },
      splitLine: { lineStyle: { color: splitLineColor } },
    },
    yAxis: [
      {
        type: "value",
        name: "MW",
        nameTextStyle: { color: labelColor },
        axisLabel: { color: labelColor },
        splitLine: { lineStyle: { color: splitLineColor } },
      },
      {
        type: "value",
        name: "件数",
        nameTextStyle: { color: labelColor },
        axisLabel: { color: labelColor },
        splitLine: { show: false },
        min: 0,
      },
    ],
    series,
    grid: { left: 60, right: 60, bottom: 50, top: 30 },
    color: Object.values(MAINTEMODE_COLORS),
  };

  return <EChartWrapper option={option} style={{ height: 350 }} ariaLabel="エリア別停止容量・件数のチャート" />;
}
