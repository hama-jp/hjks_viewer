"use client";

import dynamic from "next/dynamic";
import type { EChartsOption } from "echarts";
import type { NormalizedOutage } from "@/types/outage";
import { useChartTheme } from "@/hooks/useChartTheme";

const EChartWrapper = dynamic(
  () => import("@/components/charts/EChartWrapper"),
  { ssr: false }
);

// 停止系 (assortment 1-6) = blue tones, 低下系 (assortment 7-10) = amber tones
function getAssortmentColor(code: string): string {
  const num = parseInt(code, 10);
  if (num <= 6) {
    // 停止系 - blue shades
    const blues = ["#1e40af", "#2563eb", "#3b82f6", "#60a5fa", "#93c5fd", "#bfdbfe"];
    return blues[(num - 1) % blues.length];
  }
  // 低下系 - amber shades
  const ambers = ["#b45309", "#d97706", "#f59e0b", "#fbbf24"];
  return ambers[(num - 7) % ambers.length];
}

type Props = {
  records: NormalizedOutage[];
};

export default function AssortmentTreemap({ records }: Props) {
  const { labelColor } = useChartTheme();

  if (records.length === 0) {
    return (
      <p className="text-slate-400 dark:text-slate-500 text-sm py-20 text-center">
        データがありません
      </p>
    );
  }

  const countMap: Record<string, { name: string; count: number; code: string }> = {};
  for (const r of records) {
    if (!countMap[r.assortment]) {
      countMap[r.assortment] = {
        name: r.assortmentName,
        count: 0,
        code: r.assortment,
      };
    }
    countMap[r.assortment].count++;
  }

  const total = records.length;
  const data = Object.values(countMap).map((item) => ({
    name: item.name,
    value: item.count,
    itemStyle: { color: getAssortmentColor(item.code) },
  }));

  const option: EChartsOption = {
    tooltip: {
      formatter(params: unknown) {
        const p = params as { name: string; value: number };
        const pct = total > 0 ? ((p.value / total) * 100).toFixed(1) : "0";
        return `${p.name}<br/>件数: ${p.value} (${pct}%)`;
      },
    },
    series: [
      {
        type: "treemap",
        data,
        roam: false,
        breadcrumb: { show: false },
        label: {
          show: true,
          formatter: "{b}\n{c}件",
          fontSize: 12,
          color: labelColor,
        },
        levels: [
          {
            itemStyle: {
              borderColor: "#fff",
              borderWidth: 2,
              gapWidth: 2,
            },
          },
        ],
      },
    ],
  };

  return <EChartWrapper option={option} style={{ height: 400 }} ariaLabel="燃料種別の停止容量ツリーマップ" />;
}
