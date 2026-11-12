import type { InputHTMLAttributes, ReactNode } from "react";

import { FIELD_CLASSES } from "@/components/ui/fieldStyles";
import { cx } from "@/lib/cx";

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "id"> {
  id: string;
  label: string;
  error?: string | undefined;
  /** Shown inside the field on the right, e.g. "₫". */
  suffix?: ReactNode;
}

export function TextField({ id, label, error, suffix, className, ...inputProps }: TextFieldProps) {
  const errorId = `${id}-error`;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={cx(FIELD_CLASSES, suffix ? "pr-12" : undefined, className)}
          {...inputProps}
        />
        {suffix ? (
          <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center font-medium text-muted">
            {suffix}
          </span>
        ) : null}
      </div>
      {error ? (
        <p id={errorId} className="text-sm text-expense">
          {error}
        </p>
      ) : null}
    </div>
  );
}
