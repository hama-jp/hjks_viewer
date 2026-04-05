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
  return (
    <fieldset>
      <legend className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
        停止日時の範囲
      </legend>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => onChange("dateFrom", e.target.value)}
          className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <span className="text-sm text-slate-500 dark:text-slate-400">〜</span>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => onChange("dateTo", e.target.value)}
          className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
    </fieldset>
  );
}
