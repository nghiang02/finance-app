import type { TransactionFilters } from "@finance/shared";

/**
 * Query keys in one place (see docs/ARCHITECTURE.md), so invalidation after a mutation
 * always targets the same key the list was fetched with.
 */
export const queryKeys = {
  health: ["health"] as const,
  wallets: ["wallets"] as const,
  categories: ["categories"] as const,
  /** Root of every transaction query: invalidating it refreshes lists and single items. */
  transactions: ["transactions"] as const,
  transaction: (id: string) => ["transactions", "detail", id] as const,
  transactionList: (filters: TransactionFilters) => ["transactions", "list", filters] as const,
};
