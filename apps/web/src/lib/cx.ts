/** Joins class names, skipping falsy values: cx("a", isOn && "b"). */
export function cx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

/** "#2DB84C" + 15% opacity as 8-digit hex, for tinted icon backgrounds. */
export function tint(hex: string, alpha = 0.15): string {
  const value = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, "0");
  return `${hex}${value}`;
}
