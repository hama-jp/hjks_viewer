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
      <legend className="mb-2 text-sm font-medium text-[var(--text)]">
        {label}
      </legend>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {Object.entries(options).map(([code, name]) => {
          const inputId = `${label}-${code}`;
          return (
            <label
              key={code}
              htmlFor={inputId}
              className="flex cursor-pointer items-center gap-1.5 text-sm text-muted transition-colors hover:text-[var(--text)]"
            >
              <input
                id={inputId}
                type="checkbox"
                checked={selected.has(code)}
                onChange={() => toggle(code)}
                className="h-4 w-4 shrink-0 rounded border-[var(--border-strong)] accent-brand-600 focus:ring-brand-500"
              />
              {name}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
