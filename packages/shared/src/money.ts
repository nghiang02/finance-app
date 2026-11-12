/**
 * Money helpers.
 *
 * Rule: amounts are ALWAYS integers in the currency's smallest unit
 * (VND: dong, USD: cents). Never store or compute money as floats;
 * division below happens only to build the display string.
 */

export const DEFAULT_CURRENCY = "VND";
export const DEFAULT_LOCALE = "vi-VN";

/** Minor-unit digits per ISO 4217 currency. Unknown currencies fall back to 2. */
const CURRENCY_FRACTION_DIGITS: Readonly<Record<string, number>> = {
  VND: 0,
  JPY: 0,
  KRW: 0,
  USD: 2,
  EUR: 2,
};

export function getCurrencyFractionDigits(currency: string): number {
  return CURRENCY_FRACTION_DIGITS[currency.toUpperCase()] ?? 2;
}

/**
 * Format an integer amount (minor units) for display.
 * formatMoney(1500000) -> "1.500.000 ₫"
 * formatMoney(123456, "USD", "en-US") -> "$1,234.56"
 */
export function formatMoney(
  amount: number,
  currency = DEFAULT_CURRENCY,
  locale = DEFAULT_LOCALE,
): string {
  if (!Number.isSafeInteger(amount)) {
    throw new RangeError(`amount must be a safe integer in minor units, got ${String(amount)}`);
  }
  const digits = getCurrencyFractionDigits(currency);
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(amount / 10 ** digits);
}

/**
 * Accepts either plain digits ("1500000") or digits grouped by 3 with ONE
 * consistent separator: ".", "," or whitespace ("1.500.000", "1,500,000", "1 500 000").
 */
const VND_INPUT_PATTERN = /^(?:\d+|\d{1,3}([.,\s])\d{3}(?:\1\d{3})*)$/;

/**
 * Parse a VND amount typed by the user into an integer number of dong.
 * Returns null when the input is empty, malformed (e.g. "1.5", "-200", "abc")
 * or larger than Number.MAX_SAFE_INTEGER.
 */
export function parseMoneyInput(input: string): number | null {
  const trimmed = input.trim();
  if (!VND_INPUT_PATTERN.test(trimmed)) {
    return null;
  }
  const value = Number(trimmed.replace(/\D/g, ""));
  return Number.isSafeInteger(value) ? value : null;
}

/**
 * Formats an amount for an input field, without currency symbol or sign:
 * formatMoneyInput(1500000) -> "1.500.000". The result is accepted by parseMoneyInput,
 * so editing a value and saving it unchanged gives back the same number.
 * Built by hand (not Intl) so web and mobile produce exactly the same string.
 */
export function formatMoneyInput(amount: number): string {
  if (!Number.isSafeInteger(amount)) {
    throw new RangeError(`amount must be a safe integer in minor units, got ${String(amount)}`);
  }
  return String(Math.abs(amount)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}
