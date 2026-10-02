"use client";

import { useTheme } from "@/components/common/useTheme";

type ChartTheme = {
  theme: "light" | "dark";
  /** Treemap のタイル上に載せるラベル色（既定色に任せる場合は undefined） */
  labelColor: string | undefined;
  /** 軸ラベル・凡例・軸名など、カード背景上に置くテキスト色 */
  axisLabelColor: string;
  splitLineColor: string;
};

/**
 * ECharts で使用するテーマカラーを一元的に提供するフック。
 */
export function useChartTheme(): ChartTheme {
  const theme = useTheme();
  const isDark = theme === "dark";
  return {
    theme,
    labelColor: isDark ? "#f1f5f9" : undefined,
    axisLabelColor: isDark ? "#cbd5e1" : "#334155",
    splitLineColor: isDark ? "#334155" : "#e2e8f0",
  };
}