"use client";

type DateRangeFilterProps = {
  dateFrom: string;
  dateTo: string;
  onChange: (field: "dateFrom" | "dateTo", value: string) => void;
};

export default function DateRangeFilter({
  dateFrom,
  dateTo,
  onChange,
}: DateRangeFilterProps) {
  const isInvalid = dateFrom !== "" && dateTo !== "" && dateFrom > dateTo;
  const errorId = "date-range-error";
  const inputBase =
    "rounded-lg border bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500";
  const inputBorder = isInvalid
    ? "border-red-500 dark:border-red-400 focus:ring-red-500"
    : "border-slate-300 dark:border-slate-600";

  return (
    <fieldset>
      <legend className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
        停止日時の範囲
      </legend>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="date"
          value={dateFrom}
          max={dateTo || undefined}
          aria-invalid={isInvalid || undefined}
          aria-describedby={isInvalid ? errorId : undefined}
          onChange={(e) => onChange("dateFrom", e.target.value)}
          className={`${inputBase} ${inputBorder}`}
        />
        <span className="text-sm text-slate-500 dark:text-slate-400">〜</span>
        <input
          type="date"
          value={dateTo}
          min={dateFrom || undefined}
          aria-invalid={isInvalid || undefined}
          aria-describedby={isInvalid ? errorId : undefined}
          onChange={(e) => onChange("dateTo", e.target.value)}
          className={`${inputBase} ${inputBorder}`}
        />
      </div>
      {isInvalid && (
        <p
          id={errorId}
          role="alert"
          className="mt-2 text-xs text-red-600 dark:text-red-400"
        >
          開始日は終了日より前の日付を指定してください。
        </p>
      )}
    </fieldset>
  );
}
