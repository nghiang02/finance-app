"use client";

import { useSyncExternalStore } from "react";

/**
 * "Hide balances" preference, shared by every card on the page and remembered in this browser.
 * A tiny external store (instead of React context) so any component can read it directly.
 */
const STORAGE_KEY = "finance.hide-balances";
const listeners = new Set<() => void>();

function read(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useBalanceVisibility(): { hidden: boolean; toggle: () => void } {
  // Server render: always visible (the server cannot know the preference).
  const hidden = useSyncExternalStore(subscribe, read, () => false);
  return {
    hidden,
    toggle: () => {
      try {
        window.localStorage.setItem(STORAGE_KEY, hidden ? "0" : "1");
      } catch {
        // Storage unavailable (private mode): the toggle just does not persist.
      }
      listeners.forEach((listener) => listener());
    },
  };
}
