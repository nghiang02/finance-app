import { localDateKey } from "@finance/shared";

const DAY_MS = 24 * 60 * 60 * 1000;

function fromKey(dateKey: string): Date {
  const [year = 0, month = 1, day = 1] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

/** "Hôm nay", "Hôm qua" or "Thứ Hai, 10/11" for a "YYYY-MM-DD" key. */
export function formatDayHeading(dateKey: string, timeZone: string, now = new Date()): string {
  if (dateKey === localDateKey(now, timeZone)) {
    return "Hôm nay";
  }
  if (dateKey === localDateKey(new Date(now.getTime() - DAY_MS), timeZone)) {
    return "Hôm qua";
  }
  const text = new Intl.DateTimeFormat("vi-VN", {
    weekday: "long",
    day: "numeric",
    month: "numeric",
    timeZone: "UTC", // the key is already a local date
  }).format(fromKey(dateKey));
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** "Tháng 11/2026" for "2026-11". */
export function formatMonthLabel(month: string): string {
  const [year, number] = month.split("-");
  return `Tháng ${String(Number(number))}/${year ?? ""}`;
}

/** "12/11" for a "YYYY-MM-DD" key. */
export function formatShortDate(dateKey: string): string {
  const [, month, day] = dateKey.split("-");
  return `${day ?? ""}/${month ?? ""}`;
}

export { DAY_MS };

const timeFormatters = new Map<string, Intl.DateTimeFormat>();

/** "Hôm nay, 10:35", "Hôm qua, 08:00" or "Thứ Hai, 10/11, 21:30" in the user's time zone. */
export function formatDateTime(iso: string, timeZone: string, now = new Date()): string {
  const instant = new Date(iso);
  let formatter = timeFormatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
      timeZone,
    });
    timeFormatters.set(timeZone, formatter);
  }
  return `${formatDayHeading(localDateKey(instant, timeZone), timeZone, now)}, ${formatter.format(instant)}`;
}
