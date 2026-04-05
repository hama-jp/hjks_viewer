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
      <legend className="text-sm font-medium text-slate-700 mb-2">
        {label}
      </legend>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {Object.entries(options).map(([code, name]) => (
          <label
            key={code}
            className="flex items-center gap-1.5 text-sm text-slate-600 cursor-pointer"
          >
            <input
              type="checkbox"
              checked={selected.has(code)}
              onChange={() => toggle(code)}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            {name}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
