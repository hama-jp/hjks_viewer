import type { ReactNode } from "react";

type ChartCardProps = {
  title: string;
  description?: string;
  children: ReactNode;
  action?: ReactNode;
};

export default function ChartCard({
  title,
  description,
  children,
  action,
}: ChartCardProps) {
  return (
    <section className="surface-card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold tracking-tight text-slate-800 dark:text-slate-100">
            {title}
          </h2>
          {description && (
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {description}
            </p>
          )}
        </div>
        {action}
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}