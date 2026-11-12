import type { Category } from "@finance/shared";
import { Shapes } from "lucide-react";

import { cx, tint } from "@/lib/cx";

const FALLBACK_COLOR = "#98A2B3";

interface CategoryAvatarProps {
  icon: string | null;
  color: string | null;
  size?: "sm" | "md" | "lg";
}

/** Emoji on a circle tinted with the category color, the way finance apps show categories. */
export function CategoryAvatar({ icon, color, size = "md" }: CategoryAvatarProps) {
  const base = color ?? FALLBACK_COLOR;
  return (
    <span
      aria-hidden
      className={cx(
        "flex shrink-0 items-center justify-center rounded-full",
        size === "sm" && "size-9 text-lg",
        size === "md" && "size-11 text-xl",
        size === "lg" && "size-16 text-3xl",
      )}
      style={{
        backgroundColor: tint(base, 0.18),
        boxShadow: `inset 0 0 0 1.5px ${tint(base, 0.35)}`,
      }}
    >
      {icon ?? <Shapes className="size-1/2" style={{ color: base }} />}
    </span>
  );
}

export function CategoryName({ category }: { category: Category }) {
  return (
    <span className="flex min-w-0 items-center gap-3">
      <CategoryAvatar icon={category.icon} color={category.color} size="sm" />
      <span className="truncate font-medium">{category.name}</span>
    </span>
  );
}

/** "🍜 Ăn uống" / "   ↳ ☕ Cà phê" for <option> elements, which cannot hold markup. */
export function categoryOptionLabel(category: Category, depth: 0 | 1): string {
  const label = category.icon ? `${category.icon} ${category.name}` : category.name;
  return depth === 1 ? `   ↳ ${label}` : label;
}
