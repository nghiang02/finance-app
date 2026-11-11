/**
 * Query keys in one place (see docs/ARCHITECTURE.md), so invalidation after a mutation
 * always targets the same key the list was fetched with.
 */
export const queryKeys = {
  health: ["health"] as const,
  wallets: ["wallets"] as const,
};
