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
  const inputBase = "field";
  const inputBorder = isInvalid
    ? "border-red-500 focus:border-red-500 focus:ring-red-500/30"
    : "";

  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium text-[var(--text)]">
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
          className={`${inputBase} ${inputBorder} w-auto`}
        />
        <span className="text-sm text-muted">〜</span>
        <input
          type="date"
          value={dateTo}
          min={dateFrom || undefined}
          aria-invalid={isInvalid || undefined}
          aria-describedby={isInvalid ? errorId : undefined}
          onChange={(e) => onChange("dateTo", e.target.value)}
          className={`${inputBase} ${inputBorder} w-auto`}
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
