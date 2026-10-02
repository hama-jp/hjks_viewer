"use client";

import { useTheme } from "@/components/common/useTheme";

type ChartTheme = {
  theme: "light" | "dark";
  labelColor: string | undefined;
  mutedColor: string | undefined;
  splitLineColor: string;
  tooltipBackground: string;
  tooltipBorder: string;
  tooltipText: string;
  axisLineColor: string;
  surface: string;
};

/**
 * ECharts で使用するテーマカラーを一元的に提供するフック。
 */
export function useChartTheme(): ChartTheme {
  const theme = useTheme();
  const dark = theme === "dark";
  return {
    theme,
    labelColor: dark ? "#e2e8f0" : "#334155",
    mutedColor: dark ? "#94a3b8" : "#64748b",
    splitLineColor: dark ? "#22304a" : "#eef2f7",
    tooltipBackground: dark ? "rgba(17, 28, 46, 0.96)" : "rgba(255, 255, 255, 0.98)",
    tooltipBorder: dark ? "#334155" : "#e2e8f0",
    tooltipText: dark ? "#f1f5f9" : "#0f172a",
    axisLineColor: dark ? "#334155" : "#cbd5e1",
    surface: dark ? "#111c2e" : "#ffffff",
  };
}