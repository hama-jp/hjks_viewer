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
    <div className={`flex flex-col items-center justify-center py-12 ${className}`}>
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 dark:border-slate-700 border-t-blue-600 dark:border-t-blue-400" />
      {message && (
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{message}</p>
      )}
    </div>
  );
}
