import { cx } from "@/lib/cx";

interface SegmentedProps<T extends string> {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

/** Pill tabs for switching between a few views (e.g. Khoản chi / Khoản thu). */
export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
  className,
}: SegmentedProps<T>) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cx("inline-flex rounded-full bg-surface p-1 shadow-sm", className)}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className="flex-1 rounded-full px-5 py-2 text-sm font-semibold whitespace-nowrap text-muted transition hover:text-ink aria-pressed:bg-brand-500 aria-pressed:text-white aria-pressed:shadow-sm"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
