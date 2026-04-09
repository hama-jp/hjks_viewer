"use client";

import { useTheme } from "@/components/common/useTheme";

type ChartTheme = {
  theme: "light" | "dark";
  labelColor: string | undefined;
  splitLineColor: string;
};

/**
 * ECharts で使用するテーマカラーを一元的に提供するフック。
 */
export function useChartTheme(): ChartTheme {
  const theme = useTheme();
  return {
    theme,
    labelColor: theme === "dark" ? "#f1f5f9" : undefined,
    splitLineColor: theme === "dark" ? "#334155" : "#e2e8f0",
  };
}
