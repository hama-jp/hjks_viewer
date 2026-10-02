"use client";

type CheckboxGroupProps = {
  label: string;
  options: Record<string, string>;
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
};

export default function CheckboxGroup({
  label,
  options,
  selected,
  onChange,
}: CheckboxGroupProps) {
  const toggle = (code: string) => {
    const next = new Set(selected);
    if (next.has(code)) {
      next.delete(code);
    } else {
      next.add(code);
    }
    onChange(next);
  };

  return (
    <fieldset>
      <legend className="eyebrow mb-2.5">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {Object.entries(options).map(([code, name]) => {
          const inputId = `${label}-${code}`;
          const checked = selected.has(code);
          return (
            <label
              key={code}
              htmlFor={inputId}
              className={`inline-flex cursor-pointer items-center rounded-full border px-3 py-1.5 text-xs font-medium transition-all select-none ${
                checked
                  ? "border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-500/60 dark:bg-blue-500/10 dark:text-blue-300"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-800"
              }`}
            >
              <input
                id={inputId}
                type="checkbox"
                checked={checked}
                onChange={() => toggle(code)}
                className="sr-only"
              />
              {name}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}