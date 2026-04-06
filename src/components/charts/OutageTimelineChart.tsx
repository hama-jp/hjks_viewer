"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import type { EChartsOption } from "echarts";
import type { NormalizedOutage } from "@/types/outage";
import { useTheme } from "@/components/common/useTheme";

const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

type OutageTimelineChartProps = {
  records: NormalizedOutage[];
  maxItems?: number;
  excludePlanned?: boolean;
  rangeMonths?: number; // X軸の前後表示範囲（月数）。デフォルト12
};

const MAINTEMODE_COLORS: Record<string, string> = {
  "1": "#3b82f6", // 計画停止 blue
  "2": "#ef4444", // 計画外停止 red
  "3": "#f59e0b", // 出力低下 amber
};

import { parseOutageDate } from "@/lib/date-utils";

function formatDuration(startMs: number, endMs: number): string {
  const diffMs = endMs - startMs;
  if (diffMs < 0) return "0日0時間";
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor(
    (diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
  );
  return `${days}日${hours}時間`;
}

export default function OutageTimelineChart({
  records,
  maxItems = 20,
  excludePlanned = false,
  rangeMonths = 12,
}: OutageTimelineChartProps) {
  const [now] = useState(() => Date.now());
  const theme = useTheme();
  const labelColor = theme === "dark" ? "#f1f5f9" : undefined;

  // Filter to currently active outages (started in past, not yet restarted):
  const twoYearsAgo = now - 2 * 365.25 * 24 * 60 * 60 * 1000;
  const active = records.filter((r) => {
    const start = parseOutageDate(r.startdt);
    if (start > now) return false;
    if (start < twoYearsAgo) return false;
    if (!r.restartschdt) return true;
    const end = parseOutageDate(r.restartschdt);
    return end > now;
  });

  // Optionally exclude planned outages (dashboard mode)
  const filtered = excludePlanned
    ? active.filter((r) => r.maintemode === "2" || r.maintemode === "3")
    : active;

  // Sort by area, then startdt; limit to maxItems
  const combined = filtered
    .sort((a, b) => {
      const areaDiff = Number(a.area) - Number(b.area);
      if (areaDiff !== 0) return areaDiff;
      return parseOutageDate(a.startdt) - parseOutageDate(b.startdt);
    })
    .slice(0, maxItems);

  // combined is sorted area asc (北海道=1 first), inverse:true on yAxis puts index 0 at top
  const displayed = combined;

  if (displayed.length === 0) {
    return (
      <p className="text-slate-400 dark:text-slate-500 text-sm py-20 text-center">
        データがありません
      </p>
    );
  }

  const labels = displayed.map(
    (r) => `${r.name} ${r.unitname}`
  );

  // Build data: [yIndex, startTimestamp, endTimestamp]
  // and color/itemStyle per data point
  const seriesData = displayed.map((r, i) => {
    const start = parseOutageDate(r.startdt);
    const end = r.restartschdt ? parseOutageDate(r.restartschdt) : now;
    return {
      value: [i, start, end],
      itemStyle: {
        color: MAINTEMODE_COLORS[r.maintemode] || "#6b7280",
        opacity: r.restartschdt ? 1 : 0.6,
        borderColor: r.restartschdt ? undefined : MAINTEMODE_COLORS[r.maintemode] || "#6b7280",
        borderWidth: r.restartschdt ? 0 : 2,
        borderType: r.restartschdt ? "solid" as const : "dashed" as const,
      },
      // Attach full record for tooltip
      record: r,
    };
  });

  const chartHeight = Math.max(350, displayed.length * 32 + 120);

  const option: EChartsOption = {
    tooltip: {
      trigger: "item",
      formatter: (params: unknown) => {
        const p = params as { data?: { record?: NormalizedOutage; value?: number[] } };
        const rec = p.data?.record;
        if (!rec) return "";
        const start = parseOutageDate(rec.startdt);
        const end = rec.restartschdt ? parseOutageDate(rec.restartschdt) : now;
        const restartLabel = rec.restartschdt || (rec.outlook ? `未定（${rec.outlook}）` : "未定");
        const ongoing = !rec.restartschdt;
        const downcapacityMW = (rec.downcapacity / 1000).toFixed(1);
        return [
          `<strong>${rec.name} ${rec.unitname}</strong>`,
          `停止区分: ${rec.maintemodeName}`,
          `停止日時: ${rec.startdt}`,
          `復旧予定: ${restartLabel}${ongoing ? " <em>(停止中)</em>" : ""}`,
          `停止期間: ${formatDuration(start, end)}${ongoing ? " (継続中)" : ""}`,
          `停止原因: ${rec.factor || "―"}`,
          `低下量: ${downcapacityMW} MW`,
          `事業者: ${rec.company}`,
        ].join("<br/>");
      },
    },
    grid: {
      left: 220,
      right: 40,
      top: 20,
      bottom: 60,
      containLabel: false,
    },
    xAxis: {
      type: "time",
      min: now - rangeMonths * 30.44 * 24 * 60 * 60 * 1000,
      max: now + rangeMonths * 30.44 * 24 * 60 * 60 * 1000,
      axisLabel: {
        fontSize: 11,
        color: labelColor,
      },
    },
    yAxis: {
      type: "category",
      data: labels,
      axisLabel: {
        fontSize: 11,
        width: 200,
        overflow: "truncate",
        ellipsis: "...",
        color: labelColor,
      },
      inverse: true,
    },
    series: [
      {
        type: "custom",
        renderItem: (
          _params: unknown,
          api: unknown
        ) => {
          const a = api as {
            value: (dim: number) => number;
            coord: (val: [number, number]) => [number, number];
            size: (val: [number, number]) => [number, number];
            style: () => Record<string, unknown>;
          };
          const yIndex = a.value(0);
          const startCoord = a.coord([a.value(1), yIndex]);
          const endCoord = a.coord([a.value(2), yIndex]);
          const barHeight = a.size([0, 1])[1] * 0.6;

          const rectShape = {
            x: startCoord[0],
            y: startCoord[1] - barHeight / 2,
            width: Math.max(endCoord[0] - startCoord[0], 2),
            height: barHeight,
            r: 3,
          };

          return {
            type: "rect" as const,
            shape: rectShape,
            style: a.style(),
          };
        },
        encode: {
          x: [1, 2],
          y: 0,
        },
        data: seriesData,
        clip: true,
      },
      // Current time marker line
      {
        type: "line",
        markLine: {
          silent: true,
          symbol: "none",
          label: {
            formatter: "現在",
            position: "insideStartTop",
            fontSize: 11,
            color: "#dc2626",
          },
          lineStyle: {
            color: "#dc2626",
            width: 2,
            type: "solid",
          },
          data: [{ xAxis: now }],
        },
        data: [],
      },
    ],
    dataZoom: [
      {
        type: "inside",
        xAxisIndex: 0,
        filterMode: "none",
      },
      {
        type: "slider",
        xAxisIndex: 0,
        filterMode: "none",
        height: 20,
        bottom: 5,
        borderColor: "#e2e8f0",
        fillerColor: "rgba(59,130,246,0.15)",
        handleSize: "80%",
      },
    ],
  };

  return (
    <div role="img" aria-label="停止タイムラインのガントチャート">
      <ReactECharts
        option={option}
        style={{ height: chartHeight }}
        notMerge
        lazyUpdate
      />
      <p className="text-xs text-slate-400 dark:text-slate-500 text-right mt-1">
        {combined.length}件表示中
        {filtered.length > maxItems && `（全${filtered.length}件中）`}
      </p>
      <div className="flex items-center gap-4 mt-2 text-xs text-slate-500 dark:text-slate-400">
        {!excludePlanned && (
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: "#3b82f6" }} />
            計画停止
          </span>
        )}
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: "#ef4444" }} />
          計画外停止
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: "#f59e0b" }} />
          出力低下
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-sm opacity-60 border border-dashed border-slate-400" />
          停止中
        </span>
      </div>
    </div>
  );
}
