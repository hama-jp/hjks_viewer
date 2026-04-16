"use client";

type EmptyStateProps = {
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
};

export default function EmptyState({ message, action }: EmptyStateProps) {
  return (
    <div className="rounded-xl bg-white dark:bg-slate-800 p-8 shadow-sm border border-slate-200 dark:border-slate-700 text-center">
      <svg
        className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600 mb-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m6 4.125l2.25 2.25m0 0l2.25 2.25M12 11.625l2.25-2.25M12 11.625l-2.25 2.25M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
        />
      </svg>
      <p className="text-slate-500 dark:text-slate-400">{message}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
