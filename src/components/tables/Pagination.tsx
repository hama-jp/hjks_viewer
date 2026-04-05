"use client";

type PaginationProps = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter(
      (p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2
    )
    .reduce<(number | "...")[]>((acc, p, idx, arr) => {
      if (idx > 0 && p - (arr[idx - 1] as number) > 1) {
        acc.push("...");
      }
      acc.push(p);
      return acc;
    }, []);

  return (
    <div className="flex items-center justify-center gap-2 mt-6">
      <button
        disabled={currentPage <= 1}
        onClick={() => onPageChange(currentPage - 1)}
        className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-sm disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
      >
        前へ
      </button>
      {pageNumbers.map((p, i) =>
        p === "..." ? (
          <span key={`ellipsis-${i}`} className="px-1 text-slate-400 dark:text-slate-500">
            ...
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
              p === currentPage
                ? "bg-blue-600 text-white"
                : "border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700"
            }`}
          >
            {p}
          </button>
        )
      )}
      <button
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-sm disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
      >
        次へ
      </button>
    </div>
  );
}
