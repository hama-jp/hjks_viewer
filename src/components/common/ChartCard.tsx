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
    <section className="card p-4 sm:p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold tracking-tight text-[var(--text)]">
            {title}
          </h2>
          {description && (
            <p className="mt-0.5 text-xs text-muted">{description}</p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children}
    </section>
  );
}