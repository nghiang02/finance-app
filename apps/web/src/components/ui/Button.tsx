import type { LucideIcon } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";

import { cx } from "@/lib/cx";

type Variant = "primary" | "secondary" | "danger" | "ghost";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: "bg-brand-500 text-white shadow-sm shadow-brand-500/30 hover:bg-brand-600",
  secondary: "bg-field text-ink hover:bg-line",
  danger: "bg-expense text-white hover:brightness-95",
  ghost: "text-muted hover:bg-field hover:text-ink",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: "sm" | "md" | "lg";
  icon?: LucideIcon;
}

export function Button({
  variant = "secondary",
  size = "md",
  icon: Icon,
  type = "button",
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition focus-visible:ring-4 focus-visible:ring-brand-500/25 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
        size === "sm" && "h-9 px-3.5 text-sm",
        size === "md" && "h-11 px-5 text-sm",
        size === "lg" && "h-12 px-6",
        VARIANT_CLASSES[variant],
        className,
      )}
      {...props}
    >
      {Icon ? <Icon aria-hidden className="size-4.5" strokeWidth={2.25} /> : null}
      {children}
    </button>
  );
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon;
  label: string;
  tone?: "default" | "danger";
}

/** Round icon-only button; `label` is read by screen readers and shown as tooltip. */
export function IconButton({
  icon: Icon,
  label,
  tone = "default",
  className,
  ...props
}: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cx(
        "inline-flex size-9 items-center justify-center rounded-full text-muted transition hover:bg-field focus-visible:ring-4 focus-visible:ring-brand-500/25 focus-visible:outline-none",
        tone === "danger" ? "hover:text-expense" : "hover:text-ink",
        className,
      )}
      {...props}
    >
      <Icon aria-hidden className="size-4.5" />
    </button>
  );
}
