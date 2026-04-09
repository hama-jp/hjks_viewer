import type { ReactNode } from "react";

type KpiCardProps = {
  label: string;
  children: ReactNode;
};

export default function KpiCard({ label, children }: KpiCardProps) {
  return (
    <div className="rounded-xl bg-white dark:bg-slate-800 p-4 shadow-sm border border-slate-200 dark:border-slate-700">
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      {children}
    </div>
  );
}
