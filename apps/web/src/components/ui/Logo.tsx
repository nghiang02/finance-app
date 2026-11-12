import { PiggyBank } from "lucide-react";

import { cx } from "@/lib/cx";

export function Logo({ className, inverted = false }: { className?: string; inverted?: boolean }) {
  return (
    <span className={cx("flex items-center gap-2.5 font-bold tracking-tight", className)}>
      <span
        className={cx(
          "flex size-9 items-center justify-center rounded-xl",
          inverted
            ? "bg-white/20 text-white"
            : "bg-brand-500 text-white shadow-sm shadow-brand-500/40",
        )}
      >
        <PiggyBank aria-hidden className="size-5" strokeWidth={2.25} />
      </span>
      <span className="text-lg">Finance</span>
    </span>
  );
}
