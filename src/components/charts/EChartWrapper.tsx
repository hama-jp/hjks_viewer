"use client";

import dynamic from "next/dynamic";
import type { EChartsOption } from "echarts";

const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

type EChartWrapperProps = {
  option: EChartsOption;
  style?: React.CSSProperties;
  className?: string;
};

export default function EChartWrapper({ option, style, className }: EChartWrapperProps) {
  return (
    <ReactECharts
      option={option}
      style={style ?? { height: 350 }}
      className={className}
      notMerge
      lazyUpdate
    />
  );
}
