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
    <nav aria-label="ページネーション" className="mt-6 flex items-center justify-center gap-2">
      <button
        disabled={currentPage <= 1}
        onClick={() => onPageChange(currentPage - 1)}
        aria-label="前のページ"
        className="rounded-lg border border-[var(--border-strong)] px-3 py-1.5 text-sm transition-colors hover:bg-[var(--surface-muted)] disabled:opacity-40"
      >
        前へ
      </button>
      {pageNumbers.map((p, i) =>
        p === "..." ? (
          <span key={`ellipsis-${i}`} className="px-1 text-subtle">
            ...
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            aria-current={p === currentPage ? "page" : undefined}
            aria-label={`${p}ページ`}
            className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
              p === currentPage
                ? "bg-brand-600 font-medium text-white shadow-sm"
                : "border border-[var(--border-strong)] hover:bg-[var(--surface-muted)]"
            }`}
          >
            {p}
          </button>
        )
      )}
      <button
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        aria-label="次のページ"
        className="rounded-lg border border-[var(--border-strong)] px-3 py-1.5 text-sm transition-colors hover:bg-[var(--surface-muted)] disabled:opacity-40"
      >
        次へ
      </button>
    </nav>
  );
}
