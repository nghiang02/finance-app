import { formatMoney } from "@finance/shared";

import { cx } from "@/lib/cx";

interface MoneyProps {
  amount: number;
  currency?: string;
  /** Hide the digits (balance privacy toggle). */
  hidden?: boolean;
  /** Color negative amounts as expense. */
  signed?: boolean;
  className?: string;
}

export function Money({
  amount,
  currency = "VND",
  hidden = false,
  signed = true,
  className,
}: MoneyProps) {
  return (
    <span className={cx("tabular-nums", signed && amount < 0 && "text-expense", className)}>
      {hidden ? "••••••• ₫" : formatMoney(amount, currency)}
    </span>
  );
}
