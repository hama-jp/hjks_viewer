"use client";

import dynamic from "next/dynamic";
import type { EChartsOption } from "echarts";

const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

type EChartWrapperProps = {
  option: EChartsOption;
  style?: React.CSSProperties;
  className?: string;
  ariaLabel?: string;
};

export default function EChartWrapper({ option, style, className, ariaLabel }: EChartWrapperProps) {
  return (
    <div role={ariaLabel ? "img" : undefined} aria-label={ariaLabel}>
      <ReactECharts
        option={option}
        style={style ?? { height: 350 }}
        className={className}
        notMerge
        lazyUpdate
      />
    </div>
  );
}
