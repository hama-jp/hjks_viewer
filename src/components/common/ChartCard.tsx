import type { ReactNode } from "react";

type ChartCardProps = {
  title: string;
  children: ReactNode;
  action?: ReactNode;
};

export default function ChartCard({ title, children, action }: ChartCardProps) {
  return (
    <div className="rounded-xl bg-white dark:bg-slate-800 p-3 sm:p-6 shadow-sm border border-slate-200 dark:border-slate-700">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-slate-700 dark:text-slate-200">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </div>
  );
}
