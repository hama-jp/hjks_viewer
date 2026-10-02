import type { ReactNode } from "react";

type Tone = "default" | "danger" | "warning" | "brand";

type KpiCardProps = {
  label: string;
  children: ReactNode;
  hint?: string;
  tone?: Tone;
  icon?: ReactNode;
};

const TONE_ACCENT: Record<Tone, string> = {
  default: "bg-slate-300 dark:bg-slate-600",
  brand: "bg-brand-500",
  danger: "bg-red-500",
  warning: "bg-amber-500",
};

const TONE_ICON: Record<Tone, string> = {
  default: "bg-[var(--surface-muted)] text-muted",
  brand: "bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400",
  danger: "bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400",
  warning: "bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400",
};

export default function KpiCard({
  label,
  children,
  hint,
  tone = "default",
  icon,
}: KpiCardProps) {
  return (
    <div className="card card-hover relative overflow-hidden p-4 sm:p-5">
      <span
        className={`absolute inset-y-0 left-0 w-1 ${TONE_ACCENT[tone]}`}
        aria-hidden="true"
      />
      <div className="flex items-start justify-between gap-3 pl-1">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">
          {label}
        </p>
        {icon && (
          <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${TONE_ICON[tone]}`}
            aria-hidden="true"
          >
            {icon}
          </span>
        )}
      </div>
      <div className="mt-2 pl-1">{children}</div>
      {hint && <p className="mt-1 pl-1 text-xs text-subtle">{hint}</p>}
    </div>
  );
}