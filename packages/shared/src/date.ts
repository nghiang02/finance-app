/**
 * Calendar months in the user's time zone, without a date library.
 *
 * Timestamps are stored in UTC, but "November" means November where the user lives:
 * in Asia/Ho_Chi_Minh (UTC+7) it starts at 2026-10-31T17:00:00Z. These helpers turn a
 * "YYYY-MM" month into that UTC range, using only Intl (available in Node, browsers and Hermes).
 */

export const DEFAULT_TIME_ZONE = "Asia/Ho_Chi_Minh";

/** "YYYY-MM", month 01–12. */
export const MONTH_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/;

interface LocalParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let formatter = formatters.get(timeZone);
  if (!formatter) {
    // Throws RangeError for an unknown time zone, which is what we want.
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    formatters.set(timeZone, formatter);
  }
  return formatter;
}

/** Wall-clock date and time of `instant` in `timeZone`. */
function localParts(instant: Date, timeZone: string): LocalParts {
  const values: Record<string, number> = {};
  for (const part of formatterFor(timeZone).formatToParts(instant)) {
    if (part.type !== "literal") {
      values[part.type] = Number(part.value);
    }
  }
  return {
    year: values.year ?? 0,
    month: values.month ?? 0,
    day: values.day ?? 0,
    hour: values.hour ?? 0,
    minute: values.minute ?? 0,
    second: values.second ?? 0,
  };
}

/** Offset of `timeZone` from UTC at `instant`, in milliseconds (UTC+7 → +25 200 000). */
function offsetAt(instant: Date, timeZone: string): number {
  const p = localParts(instant, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(instant.getTime() / 1000) * 1000;
}

/**
 * The UTC instant at which the wall clock in `timeZone` shows midnight on the 1st of the month.
 * The offset is computed twice because it can differ on either side of a DST change.
 */
function startOfMonthUtc(year: number, month: number, timeZone: string): Date {
  const wallClockAsUtc = Date.UTC(year, month - 1, 1);
  const firstGuess = wallClockAsUtc - offsetAt(new Date(wallClockAsUtc), timeZone);
  return new Date(wallClockAsUtc - offsetAt(new Date(firstGuess), timeZone));
}

function parseMonth(month: string): { year: number; month: number } {
  const match = MONTH_PATTERN.exec(month);
  if (!match) {
    throw new RangeError(`Invalid month "${month}", expected YYYY-MM`);
  }
  return { year: Number(match[1]), month: Number(match[2]) };
}

function formatMonth(year: number, month: number): string {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}`;
}

/**
 * [start, end) of a month in the user's time zone, as UTC instants.
 * Query with `occurredAt >= start AND occurredAt < end` (end is exclusive).
 */
export function monthRange(month: string, timeZone: string): { start: Date; end: Date } {
  const { year, month: m } = parseMonth(month);
  const next = m === 12 ? { year: year + 1, month: 1 } : { year, month: m + 1 };
  return {
    start: startOfMonthUtc(year, m, timeZone),
    end: startOfMonthUtc(next.year, next.month, timeZone),
  };
}

/** The month ("YYYY-MM") that `instant` falls in, in `timeZone`. */
export function monthOf(instant: Date, timeZone: string): string {
  const p = localParts(instant, timeZone);
  return formatMonth(p.year, p.month);
}

/** The current month in `timeZone`. */
export function currentMonth(timeZone: string, now: Date = new Date()): string {
  return monthOf(now, timeZone);
}

/** "2026-11" + 2 → "2027-01"; negative deltas go back. */
export function shiftMonth(month: string, delta: number): string {
  const { year, month: m } = parseMonth(month);
  const index = year * 12 + (m - 1) + delta;
  return formatMonth(Math.floor(index / 12), (index % 12) + 1);
}

/** "YYYY-MM-DD" of `instant` in `timeZone`, e.g. to group a list by day. */
export function localDateKey(instant: Date, timeZone: string): string {
  const p = localParts(instant, timeZone);
  return `${formatMonth(p.year, p.month)}-${String(p.day).padStart(2, "0")}`;
}
