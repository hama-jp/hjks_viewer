import { describe, it, expect } from "vitest";
import { buildBarChartOption } from "@/lib/chart-utils";

describe("buildBarChartOption", () => {
  const items = [
    { label: "北海道", count: 5 },
    { label: "東京", count: 12 },
    { label: "関西", count: 3 },
  ];

  it("should build a bar chart option with correct category data", () => {
    const option = buildBarChartOption({ items, color: "#3b82f6" });
    const xAxis = option.xAxis as { data: string[] };
    expect(xAxis.data).toEqual(["北海道", "東京", "関西"]);
  });

  it("should build a bar chart option with correct series data", () => {
    const option = buildBarChartOption({ items, color: "#3b82f6" });
    const series = option.series as { data: number[] }[];
    expect(series[0].data).toEqual([5, 12, 3]);
  });

  it("should use the provided color", () => {
    const option = buildBarChartOption({ items, color: "#8b5cf6" });
    const series = option.series as { type: string; itemStyle: { color: string } }[];
    expect(series[0].itemStyle.color).toBe("#8b5cf6");
  });

  it("should apply theme colors when provided", () => {
    const option = buildBarChartOption({
      items,
      color: "#3b82f6",
      labelColor: "#f1f5f9",
      splitLineColor: "#334155",
    });
    const xAxis = option.xAxis as { axisLabel: { color: string } };
    expect(xAxis.axisLabel.color).toBe("#f1f5f9");
  });

  it("should use custom grid bottom when provided", () => {
    const option = buildBarChartOption({ items, color: "#3b82f6", gridBottom: 80 });
    const grid = option.grid as { bottom: number };
    expect(grid.bottom).toBe(80);
  });

  it("should handle empty items", () => {
    const option = buildBarChartOption({ items: [], color: "#3b82f6" });
    const xAxis = option.xAxis as { data: string[] };
    expect(xAxis.data).toEqual([]);
  });
});
