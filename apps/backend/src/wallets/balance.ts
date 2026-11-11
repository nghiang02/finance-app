/** Sum of non-deleted transaction amounts touching one wallet, grouped by direction. */
export interface WalletMovements {
  income: bigint;
  expense: bigint;
  transferOut: bigint;
  transferIn: bigint;
}

export const NO_MOVEMENTS: WalletMovements = {
  income: 0n,
  expense: 0n,
  transferOut: 0n,
  transferIn: 0n,
};

/**
 * Balance = initial balance + income − expense − transfers out + transfers in
 * (docs/PROJECT_CONTEXT.md). Computed with BigInt so no amount is ever rounded.
 */
export function computeBalance(initialBalance: bigint, movements: WalletMovements): bigint {
  return (
    initialBalance +
    movements.income -
    movements.expense -
    movements.transferOut +
    movements.transferIn
  );
}
