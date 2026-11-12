import { type Category, flattenCategoryTree } from "@finance/shared";

import type { ChipOption } from "@/components/ChipGroup";

export function categoryText(category: Category): string {
  return category.icon ? `${category.icon} ${category.name}` : category.name;
}

/** Chips in tree order; children are marked with "↳". */
export function categoryChips(categories: readonly Category[]): ChipOption<string>[] {
  return flattenCategoryTree(categories).map(({ category, depth }) => ({
    value: category.id,
    label: depth === 1 ? `↳ ${categoryText(category)}` : categoryText(category),
  }));
}
