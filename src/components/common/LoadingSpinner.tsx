"use client";

type LoadingSpinnerProps = {
  message?: string;
  className?: string;
};

export default function LoadingSpinner({
  message,
  className = "",
}: LoadingSpinnerProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center py-12 ${className}`}
    >
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--border-strong)] border-t-brand-600" />
      {message && <p className="mt-3 text-sm text-muted">{message}</p>}
    </div>
  );
}