import type { InputHTMLAttributes } from "react";

interface SwitchFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "type"> {
  id: string;
  label: string;
  hint?: string;
}

/** On/off setting. A real checkbox (keyboard and screen readers work) drawn as a switch. */
export function SwitchField({ id, label, hint, ...inputProps }: SwitchFieldProps) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-center gap-4 rounded-2xl bg-field px-4 py-3"
    >
      <span className="flex flex-1 flex-col">
        <span className="text-sm font-medium text-ink">{label}</span>
        {hint ? <span className="text-xs text-muted">{hint}</span> : null}
      </span>
      <input
        id={id}
        name={id}
        type="checkbox"
        role="switch"
        className="peer sr-only"
        {...inputProps}
      />
      <span
        aria-hidden
        className="relative h-6 w-11 shrink-0 rounded-full bg-line transition peer-checked:bg-brand-500 peer-focus-visible:ring-4 peer-focus-visible:ring-brand-500/25 after:absolute after:top-0.5 after:left-0.5 after:size-5 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-5"
      />
    </label>
  );
}
