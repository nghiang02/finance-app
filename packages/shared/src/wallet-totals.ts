import type { Wallet } from "./schemas/wallet.js";

export interface CurrencyTotal {
  currency: string;
  /** Smallest currency unit. */
  total: number;
}

/**
 * Total balance of the active (not archived) wallets, one entry per currency in the order
 * the currencies first appear. Amounts in different currencies are never added together.
 * Summed as BigInt so a large total fails loudly instead of losing precision.
 */
export function totalBalanceByCurrency(
  wallets: readonly Pick<Wallet, "currency" | "balance" | "archived">[],
): CurrencyTotal[] {
  const totals = new Map<string, bigint>();
  for (const wallet of wallets) {
    if (!wallet.archived) {
      totals.set(wallet.currency, (totals.get(wallet.currency) ?? 0n) + BigInt(wallet.balance));
    }
  }
  return [...totals].map(([currency, total]) => {
    if (total > BigInt(Number.MAX_SAFE_INTEGER) || total < BigInt(Number.MIN_SAFE_INTEGER)) {
      throw new RangeError(`Total balance in ${currency} is too large to display`);
    }
    return { currency, total: Number(total) };
  });
}
