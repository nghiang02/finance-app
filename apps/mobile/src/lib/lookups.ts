import { useCategories, useWallets } from "@finance/api-client";
import type { Category, Wallet } from "@finance/shared";

/** Categories and wallets by id, to show names next to transactions (which store only ids). */
export function useLookups(): {
  categoriesById: ReadonlyMap<string, Category>;
  walletsById: ReadonlyMap<string, Wallet>;
} {
  const categories = useCategories();
  const wallets = useWallets();
  return {
    categoriesById: new Map((categories.data ?? []).map((category) => [category.id, category])),
    walletsById: new Map((wallets.data ?? []).map((wallet) => [wallet.id, wallet])),
  };
}
