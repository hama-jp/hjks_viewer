import type { EChartsOption } from "echarts";

type BarChartItem = {
  label: string;
  count: number;
};

type TooltipTheme = {
  tooltipBackground: string;
  tooltipBorder: string;
  tooltipText: string;
};

/**
 * ECharts のツールチップをモダンなカード風に見せる共通スタイル。
 */
export function buildTooltipStyle({
  tooltipBackground,
  tooltipBorder,
  tooltipText,
}: TooltipTheme) {
  return {
    backgroundColor: tooltipBackground,
    borderColor: tooltipBorder,
    borderWidth: 1,
    padding: [8, 12] as [number, number],
    textStyle: { color: tooltipText, fontSize: 12 },
    extraCssText:
      "border-radius:12px;box-shadow:0 8px 24px -8px rgba(15,23,42,0.25);backdrop-filter:blur(6px);",
  };
}

type BuildBarChartOptionParams = {
  items: BarChartItem[];
  color: string;
  labelColor?: string;
  splitLineColor?: string;
  gridBottom?: number;
};

/**
 * カテゴリ別件数の棒グラフオプションを生成する。
 * Dashboard のエリア別・フォーマット別グラフで共通利用。
 */
export function buildBarChartOption({
  items,
  color,
  labelColor,
  splitLineColor = "#e2e8f0",
  gridBottom = 60,
}: BuildBarChartOptionParams): EChartsOption {
  return {
    tooltip: { trigger: "axis" },
    xAxis: {
      type: "category",
      data: items.map((i) => i.label),
      axisLabel: { rotate: 30, fontSize: 11, color: labelColor },
      splitLine: { lineStyle: { color: splitLineColor } },
    },
    yAxis: {
      type: "value",
      name: "件数",
      nameTextStyle: { color: labelColor },
      axisLabel: { color: labelColor },
      splitLine: { lineStyle: { color: splitLineColor } },
    },
    series: [
      {
        type: "bar",
        data: items.map((i) => i.count),
        itemStyle: { color },
      },
    ],
    grid: { left: 50, right: 20, bottom: gridBottom, top: 30 },
  };
}
