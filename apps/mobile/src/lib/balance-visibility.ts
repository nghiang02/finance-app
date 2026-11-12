import { useSyncExternalStore } from "react";

/**
 * "Hide balances" toggle shared by every screen (in memory for now). A tiny external store
 * instead of React context, so any component can read it without a provider.
 */
let hidden = false;
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useBalanceVisibility(): { hidden: boolean; toggle: () => void } {
  const value = useSyncExternalStore(subscribe, () => hidden);
  return {
    hidden: value,
    toggle: () => {
      hidden = !hidden;
      listeners.forEach((listener) => listener());
    },
  };
}
