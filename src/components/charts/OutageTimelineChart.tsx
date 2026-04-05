"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import type { EChartsOption } from "echarts";
import type { NormalizedOutage } from "@/types/outage";

const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

type OutageTimelineChartProps = {
  records: NormalizedOutage[];
  maxItems?: number;
};

const MAINTEMODE_COLORS: Record<string, string> = {
  "1": "#3b82f6", // 計画停止 blue
  "2": "#ef4444", // 計画外停止 red
  "3": "#f59e0b", // 出力低下 amber
};

function parseOutageDate(dateStr: string): number {
  const [date, time] = dateStr.split(" ");
  const [y, m, d] = date.split("/").map(Number);
  const [h, min] = (time || "00:00").split(":").map(Number);
  return new Date(y, m - 1, d, h, min).getTime();
}

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
}: OutageTimelineChartProps) {
  const [now] = useState(() => Date.now());

  // Sort by startdt descending and take top N
  const sorted = [...records]
    .sort((a, b) => {
      const at = parseOutageDate(a.startdt);
      const bt = parseOutageDate(b.startdt);
      return bt - at;
    })
    .slice(0, maxItems);

  // Reverse so newest is at top in the chart (top of y-axis)
  const displayed = [...sorted].reverse();

  if (displayed.length === 0) {
    return (
      <p className="text-slate-400 text-sm py-20 text-center">
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

  const chartHeight = Math.max(300, displayed.length * 32 + 80);

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
      left: 180,
      right: 40,
      top: 20,
      bottom: 40,
    },
    xAxis: {
      type: "time",
      axisLabel: {
        fontSize: 11,
      },
    },
    yAxis: {
      type: "category",
      data: labels,
      axisLabel: {
        fontSize: 11,
        width: 160,
        overflow: "truncate",
        ellipsis: "...",
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
      },
    ],
    dataZoom: [
      {
        type: "inside",
        xAxisIndex: 0,
        filterMode: "weakFilter",
      },
    ],
  };

  return (
    <div>
      <ReactECharts
        option={option}
        style={{ height: chartHeight }}
        notMerge
        lazyUpdate
      />
      {records.length > maxItems && (
        <p className="text-xs text-slate-400 text-right mt-1">
          上位{maxItems}件を表示（全{records.length}件）
        </p>
      )}
      <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <span
            className="inline-block w-3 h-3 rounded-sm"
            style={{ backgroundColor: "#3b82f6" }}
          />
          計画停止
        </span>
        <span className="flex items-center gap-1">
          <span
            className="inline-block w-3 h-3 rounded-sm"
            style={{ backgroundColor: "#ef4444" }}
          />
          計画外停止
        </span>
        <span className="flex items-center gap-1">
          <span
            className="inline-block w-3 h-3 rounded-sm"
            style={{ backgroundColor: "#f59e0b" }}
          />
          出力低下
        </span>
        <span className="flex items-center gap-1">
          <span
            className="inline-block w-3 h-3 rounded-sm opacity-60 border border-dashed border-slate-400"
          />
          停止中
        </span>
      </div>
    </div>
  );
}
