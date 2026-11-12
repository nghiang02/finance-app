"use client";

import type { Wallet } from "@finance/shared";
import { totalBalanceByCurrency } from "@finance/shared";
import { Eye, EyeOff } from "lucide-react";
import type { ReactNode } from "react";

import { Money } from "@/components/ui/Money";
import { useBalanceVisibility } from "@/lib/balance-visibility";

/** Green hero card with the total of active wallets and an eye toggle to hide amounts. */
export function BalanceCard({ wallets, footer }: { wallets: Wallet[]; footer?: ReactNode }) {
  const { hidden, toggle } = useBalanceVisibility();
  const totals = totalBalanceByCurrency(wallets);
  const shown = totals.length > 0 ? totals : [{ currency: "VND", total: 0 }];
  const activeCount = wallets.filter((wallet) => !wallet.archived).length;

  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-500 via-brand-600 to-brand-700 p-6 text-white shadow-lg shadow-brand-600/25 sm:p-7">
      {/* Decorative circles */}
      <span aria-hidden className="absolute -top-16 -right-10 size-48 rounded-full bg-white/10" />
      <span aria-hidden className="absolute -right-20 -bottom-24 size-56 rounded-full bg-white/5" />

      <div className="relative flex flex-col gap-1">
        <div className="flex items-center gap-2 text-sm font-medium text-white/80">
          Tổng số dư
          <button
            type="button"
            onClick={toggle}
            aria-label={hidden ? "Hiện số dư" : "Ẩn số dư"}
            aria-pressed={hidden}
            className="inline-flex size-7 items-center justify-center rounded-full transition hover:bg-white/15"
          >
            {hidden ? (
              <EyeOff aria-hidden className="size-4" />
            ) : (
              <Eye aria-hidden className="size-4" />
            )}
          </button>
        </div>
        {shown.map(({ currency, total }) => (
          <Money
            key={currency}
            amount={total}
            currency={currency}
            hidden={hidden}
            signed={false}
            className="text-3xl font-bold tracking-tight sm:text-4xl"
          />
        ))}
        <p className="mt-2 text-sm text-white/75">{activeCount} ví đang dùng</p>
        {footer}
      </div>
    </section>
  );
}
