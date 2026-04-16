"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { EChartsOption } from "echarts";
import type { NormalizedOutage } from "@/types/outage";
import { useChartTheme } from "@/hooks/useChartTheme";
import { MAINTEMODE_COLORS } from "@/lib/constants";

const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

const SM_BREAKPOINT = 640;

/** Tooltip display only needs a subset of fields — avoid storing full NormalizedOutage */
type TooltipRecord = Pick<
  NormalizedOutage,
  "name" | "unitname" | "maintemodeName" | "startdt" | "restartschdt" | "outlook" | "factor" | "downcapacity" | "company"
>;

type OutageTimelineChartProps = {
  records: NormalizedOutage[];
  maxItems?: number;
  excludePlanned?: boolean;
  includeFuture?: boolean; // trueの場合、将来の停止予定も表示する
  rangeMonths?: number; // X軸の前後表示範囲（月数）。デフォルト12
};

import { parseOutageDate, formatDuration, formatShortDate } from "@/lib/date-utils";

const LABEL_BOTH_MIN_WIDTH = 100;
const LABEL_START_MIN_WIDTH = 50;

export default function OutageTimelineChart({
  records,
  maxItems = 20,
  excludePlanned = false,
  includeFuture = false,
  rangeMonths = 12,
}: OutageTimelineChartProps) {
  const [now] = useState(() => Date.now());
  const { labelColor } = useChartTheme();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < SM_BREAKPOINT);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Filter outages for display
  const futureLimit = now + 365.25 * 24 * 60 * 60 * 1000; // 1年先まで
  const active = records.filter((r) => {
    const start = parseOutageDate(r.startdt);
    if (includeFuture) {
      // 将来停止も含める（1年先まで）
      if (start > futureLimit) return false;
      // 復旧予定が過去＝既に復旧済みなら除外（長期停止中の号機は含む）
      if (r.restartschdt && parseOutageDate(r.restartschdt) <= now) return false;
    } else {
      // 従来動作: 将来開始は除外
      if (start > now) return false;
      if (!r.restartschdt) return true;
      if (parseOutageDate(r.restartschdt) <= now) return false;
    }
    return true;
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
      <p className="text-slate-500 dark:text-slate-400 text-sm py-20 text-center">
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
    const isFuture = start > now;
    const isOngoing = !r.restartschdt && !isFuture;
    const hasEndDate = r.restartschdt != null;
    const isTransparent = isFuture || isOngoing;
    const tooltipRecord: TooltipRecord = {
      name: r.name, unitname: r.unitname, maintemodeName: r.maintemodeName,
      startdt: r.startdt, restartschdt: r.restartschdt, outlook: r.outlook,
      factor: r.factor, downcapacity: r.downcapacity, company: r.company,
    };
    return {
      value: [i, start, end, hasEndDate ? 1 : 0, isTransparent ? 1 : 0],
      itemStyle: {
        color: MAINTEMODE_COLORS[r.maintemode] || "#6b7280",
        opacity: isFuture ? 0.4 : (isOngoing ? 0.6 : 1),
        borderColor: (isFuture || isOngoing) ? MAINTEMODE_COLORS[r.maintemode] || "#6b7280" : undefined,
        borderWidth: (isFuture || isOngoing) ? 2 : 0,
        borderType: isFuture ? "dashed" as const : (isOngoing ? "dashed" as const : "solid" as const),
      },
      record: tooltipRecord,
    };
  });

  const chartHeight = isMobile
    ? Math.max(300, displayed.length * 28 + 100)
    : Math.max(350, displayed.length * 32 + 120);

  const gridLeft = isMobile ? 100 : 220;
  const gridRight = isMobile ? 16 : 40;
  const yLabelWidth = isMobile ? 80 : 200;
  const axisFontSize = isMobile ? 10 : 11;

  const option: EChartsOption = {
    tooltip: {
      trigger: "item",
      confine: true,
      formatter: (params: unknown) => {
        const p = params as { data?: { record?: TooltipRecord; value?: number[] } };
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
      left: gridLeft,
      right: gridRight,
      top: 20,
      bottom: 60,
      containLabel: false,
    },
    xAxis: {
      type: "time",
      min: now - rangeMonths * 30.44 * 24 * 60 * 60 * 1000,
      max: now + rangeMonths * 30.44 * 24 * 60 * 60 * 1000,
      axisLabel: {
        fontSize: axisFontSize,
        color: labelColor,
      },
    },
    yAxis: {
      type: "category",
      data: labels,
      axisLabel: {
        fontSize: axisFontSize,
        width: yLabelWidth,
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
          params: unknown,
          api: unknown
        ) => {
          const a = api as {
            value: (dim: number) => number;
            coord: (val: [number, number]) => [number, number];
            size: (val: [number, number]) => [number, number];
            style: () => Record<string, unknown>;
          };
          const p = params as {
            coordSys: { x: number; y: number; width: number; height: number };
          };
          const gridLeft = p.coordSys.x;
          const gridRight = p.coordSys.x + p.coordSys.width;

          const yIndex = a.value(0);
          const startCoord = a.coord([a.value(1), yIndex]);
          const endCoord = a.coord([a.value(2), yIndex]);
          const barHeight = a.size([0, 1])[1] * 0.6;
          const barWidth = Math.max(endCoord[0] - startCoord[0], 2);

          const rectShape = {
            x: startCoord[0],
            y: startCoord[1] - barHeight / 2,
            width: barWidth,
            height: barHeight,
            r: 3,
          };

          // Visible portion of the bar within the grid
          const visibleLeft = Math.max(rectShape.x, gridLeft);
          const visibleRight = Math.min(rectShape.x + barWidth, gridRight);
          const visibleWidth = visibleRight - visibleLeft;

          const hasEndDate = a.value(3) === 1;
          const isTransparent = a.value(4) === 1;
          const textColor = isTransparent ? (labelColor ?? "#1e293b") : "#fff";

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const children: any[] = [
            { type: "rect", shape: rectShape, style: a.style() },
          ];

          if (visibleWidth >= LABEL_START_MIN_WIDTH) {
            children.push({
              type: "text",
              style: {
                x: visibleLeft + 4,
                y: rectShape.y + barHeight / 2,
                text: formatShortDate(a.value(1)),
                textAlign: "left",
                textVerticalAlign: "middle",
                fontSize: 10,
                fill: textColor,
                fontWeight: "bold",
              },
              silent: true,
            });
          }

          if (visibleWidth >= LABEL_BOTH_MIN_WIDTH && hasEndDate) {
            children.push({
              type: "text",
              style: {
                x: visibleRight - 4,
                y: rectShape.y + barHeight / 2,
                text: formatShortDate(a.value(2)),
                textAlign: "right",
                textVerticalAlign: "middle",
                fontSize: 10,
                fill: textColor,
                fontWeight: "bold",
              },
              silent: true,
            });
          }

          return { type: "group" as const, children };
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
        height: isMobile ? 28 : 20,
        bottom: 5,
        borderColor: "#e2e8f0",
        fillerColor: "rgba(59,130,246,0.15)",
        handleSize: isMobile ? "120%" : "80%",
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
      <p className="text-xs text-slate-500 dark:text-slate-400 text-right mt-1">
        {combined.length}件表示中
        {filtered.length > maxItems && `（全${filtered.length}件中）`}
      </p>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-slate-500 dark:text-slate-400">
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
