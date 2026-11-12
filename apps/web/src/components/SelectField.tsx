import { ChevronDown } from "lucide-react";
import type { SelectHTMLAttributes } from "react";

import { FIELD_CLASSES } from "@/components/ui/fieldStyles";
import { cx } from "@/lib/cx";

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectFieldProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "id"> {
  id: string;
  label: string;
  options: readonly SelectOption[];
  error?: string | undefined;
}

export function SelectField({ id, label, options, error, ...selectProps }: SelectFieldProps) {
  const errorId = `${id}-error`;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          name={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={cx(FIELD_CLASSES, "appearance-none pr-10 [&>option]:bg-surface")}
          {...selectProps}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          aria-hidden
          className="pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2 text-muted"
        />
      </div>
      {error ? (
        <p id={errorId} className="text-sm text-expense">
          {error}
        </p>
      ) : null}
    </div>
  );
}
