/**
 * Money is BigInt in the database and a plain integer number in JSON (see ARCHITECTURE.md).
 * These two functions are the only place where that conversion happens.
 */

export function moneyToNumber(amount: bigint): number {
  if (amount > BigInt(Number.MAX_SAFE_INTEGER) || amount < BigInt(Number.MIN_SAFE_INTEGER)) {
    // Never silently round money: fail loudly instead.
    throw new RangeError(`Amount ${amount.toString()} cannot be represented exactly in JSON`);
  }
  return Number(amount);
}

export function moneyToBigInt(amount: number): bigint {
  if (!Number.isSafeInteger(amount)) {
    throw new RangeError(`Amount ${String(amount)} must be a safe integer`);
  }
  return BigInt(amount);
}
