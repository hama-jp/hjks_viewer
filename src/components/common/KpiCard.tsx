import type { ReactNode } from "react";

export type KpiTone = "slate" | "blue" | "red" | "amber" | "emerald";

const TONE_STYLES: Record<
  KpiTone,
  { chip: string; bar: string }
> = {
  slate: {
    chip: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
    bar: "from-slate-300 to-slate-400 dark:from-slate-600 dark:to-slate-500",
  },
  blue: {
    chip: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
    bar: "from-blue-500 to-indigo-500",
  },
  red: {
    chip: "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400",
    bar: "from-red-500 to-rose-500",
  },
  amber: {
    chip: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
    bar: "from-amber-400 to-orange-500",
  },
  emerald: {
    chip: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
    bar: "from-emerald-400 to-teal-500",
  },
};

type KpiCardProps = {
  label: string;
  value: ReactNode;
  unit?: string;
  icon?: ReactNode;
  tone?: KpiTone;
  hint?: string;
};

export default function KpiCard({
  label,
  value,
  unit,
  icon,
  tone = "slate",
  hint,
}: KpiCardProps) {
  const styles = TONE_STYLES[tone];

  return (
    <div className="surface-card group relative overflow-hidden p-5 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <p className="eyebrow pt-0.5">{label}</p>
        {icon && (
          <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${styles.chip}`}
            aria-hidden="true"
          >
            {icon}
          </span>
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-baseline gap-x-1.5">
        <span className="text-2xl leading-none font-bold tracking-tight tabular-nums text-slate-900 sm:text-3xl dark:text-white">
          {value}
        </span>
        {unit && (
          <span className="text-sm font-medium text-slate-400 dark:text-slate-500">
            {unit}
          </span>
        )}
      </div>
      {hint && (
        <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">{hint}</p>
      )}
      <span
        className={`absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r ${styles.bar}`}
        aria-hidden="true"
      />
    </div>
  );
}