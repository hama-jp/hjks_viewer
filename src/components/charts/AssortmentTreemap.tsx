"use client";

import dynamic from "next/dynamic";
import type { EChartsOption } from "echarts";
import type { NormalizedOutage } from "@/types/outage";
import { useChartTheme } from "@/hooks/useChartTheme";
import { buildTooltipStyle } from "@/lib/chart-utils";

const EChartWrapper = dynamic(
  () => import("@/components/charts/EChartWrapper"),
  { ssr: false }
);

// 停止系 (assortment 1-6) = blue tones, 低下系 (assortment 7-10) = amber tones
function getAssortmentColor(code: string): string {
  const num = parseInt(code, 10);
  // 不明・未分類は中立色
  if (Number.isNaN(num)) return "#94a3b8";
  if (num >= 1 && num <= 6) {
    // 停止系 - blue shades
    const blues = ["#1e40af", "#2563eb", "#3b82f6", "#60a5fa", "#93c5fd", "#bfdbfe"];
    return blues[(num - 1) % blues.length];
  }
  if (num >= 7 && num <= 10) {
    // 低下系 - amber shades
    const ambers = ["#b45309", "#d97706", "#f59e0b", "#fbbf24"];
    return ambers[(num - 7) % ambers.length];
  }
  return "#94a3b8";
}

/** 背景色が明るいかどうかを相対輝度で判定する。 */
function isLightColor(hex: string): boolean {
  const m = hex.replace("#", "");
  if (m.length !== 6) return false;
  const r = parseInt(m.slice(0, 2), 16) / 255;
  const g = parseInt(m.slice(2, 4), 16) / 255;
  const b = parseInt(m.slice(4, 6), 16) / 255;
  const toLinear = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  const luminance =
    0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  return luminance > 0.5;
}

type Props = {
  records: NormalizedOutage[];
};

export default function AssortmentTreemap({ records }: Props) {
  const { tooltipBackground, tooltipBorder, tooltipText, surface } = useChartTheme();

  if (records.length === 0) {
    return (
      <p className="text-slate-500 dark:text-slate-400 text-sm py-20 text-center">
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
  const data = Object.values(countMap).map((item) => {
    const color = getAssortmentColor(item.code);
    return {
      name: item.name,
      value: item.count,
      itemStyle: { color },
      // 塗りの輝度に応じてラベル色を切り替える
      label: { color: isLightColor(color) ? "#0f172a" : "#ffffff" },
    };
  });

  const option: EChartsOption = {
    tooltip: {
      ...buildTooltipStyle({ tooltipBackground, tooltipBorder, tooltipText }),
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
          position: "inside",
          color: "#ffffff",
          formatter: "{name|{b}}\n{value|{c}件}",
          overflow: "truncate",
          lineHeight: 17,
          textShadowBlur: 2,
          textShadowColor: "rgba(0,0,0,0.3)",
          rich: {
            name: {
              fontSize: 12,
              fontWeight: "bold",
              lineHeight: 17,
            },
            value: {
              fontSize: 11,
              lineHeight: 15,
              opacity: 0.85,
            },
          },
        },
        itemStyle: { borderColor: "transparent", borderWidth: 0 },
        levels: [
          {
            itemStyle: {
              borderColor: surface,
              borderWidth: 2,
              gapWidth: 2,
              borderRadius: 6,
            },
          },
        ],
      },
    ],
  };

  return <EChartWrapper option={option} style={{ height: 400 }} ariaLabel="燃料種別の停止容量ツリーマップ" />;
}
