import type { Wallet } from "@finance/shared";

/**
 * The wallet of the last saved transaction, so the next one defaults to it (most people
 * record several expenses from the same wallet in a row). Kept in memory for the session.
 */
let lastWalletId: string | null = null;

export function rememberWallet(walletId: string): void {
  lastWalletId = walletId;
}

/** Last used wallet if it can still receive transactions, otherwise the first active one. */
export function defaultWalletId(wallets: readonly Wallet[]): string | null {
  const active = wallets.filter((wallet) => !wallet.archived);
  return active.find((wallet) => wallet.id === lastWalletId)?.id ?? active[0]?.id ?? null;
}
