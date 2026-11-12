import { z } from "zod";

import { idSchema } from "./common.js";

export const CATEGORY_TYPES = ["INCOME", "EXPENSE"] as const;
export const categoryTypeSchema = z.enum(CATEGORY_TYPES);
export type CategoryType = z.infer<typeof categoryTypeSchema>;

/** "#RRGGBB", stored upper-case so the same color is always the same string. */
export const hexColorSchema = z
  .string()
  .trim()
  .regex(/^#[0-9A-Fa-f]{6}$/, "Màu không hợp lệ, ví dụ #F97316")
  .toUpperCase();

/**
 * An emoji (renders the same on web and mobile without an icon library).
 * Not checked character by character: one emoji can be up to ~10 code points
 * (skin tones, flags, ZWJ sequences), so only the length is limited.
 */
export const categoryIconSchema = z
  .string()
  .trim()
  .min(1, "Icon không được để trống")
  .max(16, "Icon quá dài");

const categoryNameSchema = z
  .string()
  .trim()
  .min(1, "Tên danh mục không được để trống")
  .max(50, "Tên danh mục tối đa 50 ký tự");

export const createCategoryRequestSchema = z.strictObject({
  name: categoryNameSchema,
  /** A child must have the same type as its parent. */
  type: categoryTypeSchema,
  icon: categoryIconSchema.nullable().optional(),
  /** Omitted on a child: inherits the parent's color. */
  color: hexColorSchema.nullable().optional(),
  /** Only top-level categories can be parents (two levels at most). */
  parentId: idSchema.nullable().optional(),
});
export type CreateCategoryRequest = z.infer<typeof createCategoryRequestSchema>;
export type CreateCategoryInput = z.input<typeof createCategoryRequestSchema>;

/**
 * `type` cannot change: existing transactions and budgets of the category would end up
 * on the wrong side (income counted as expense). Create a new category instead.
 * `parentId: null` turns a child into a top-level category.
 */
export const updateCategoryRequestSchema = z
  .strictObject({
    name: categoryNameSchema,
    icon: categoryIconSchema.nullable(),
    color: hexColorSchema.nullable(),
    parentId: idSchema.nullable(),
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, "Không có thay đổi nào");
export type UpdateCategoryRequest = z.infer<typeof updateCategoryRequestSchema>;
export type UpdateCategoryInput = z.input<typeof updateCategoryRequestSchema>;

/**
 * Query of `DELETE /categories/:id`. When the category (or one of its children) still has
 * transactions, they are moved to `replacementId`; without it the API answers 409.
 */
export const deleteCategoryQuerySchema = z.object({
  replacementId: idSchema.optional(),
});
export type DeleteCategoryQuery = z.infer<typeof deleteCategoryQuerySchema>;

/** `details` of the 409 CONFLICT answered when a used category is deleted without a replacement. */
export const categoryInUseDetailsSchema = z.object({
  reason: z.literal("CATEGORY_IN_USE"),
  transactionCount: z.number().int().positive(),
});
export type CategoryInUseDetails = z.infer<typeof categoryInUseDetailsSchema>;

export const categorySchema = z.object({
  id: z.string(),
  name: z.string(),
  type: categoryTypeSchema,
  icon: z.string().nullable(),
  color: z.string().nullable(),
  parentId: z.string().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type Category = z.infer<typeof categorySchema>;

/** Flat list (parents and children together); build the tree with `buildCategoryTree`. */
export const categoryListSchema = z.array(categorySchema);

export interface CategoryNode extends Category {
  children: Category[];
}

/**
 * Vietnamese alphabetical order ("Ăn uống" right after "An", not after "Z").
 * The database sorts by byte value, so ordering is done here, the same way on web and mobile.
 */
const vietnameseCollator = new Intl.Collator("vi", { sensitivity: "base" });

export function compareCategoryNames(a: Pick<Category, "name">, b: Pick<Category, "name">): number {
  return vietnameseCollator.compare(a.name, b.name);
}

/**
 * Groups a flat list into top-level categories with their children, both sorted by name
 * in Vietnamese order. The API returns a flat list so a transaction can look up its
 * category by id directly; screens that show the hierarchy use this.
 */
export function buildCategoryTree(categories: readonly Category[]): CategoryNode[] {
  const sorted = [...categories].sort(compareCategoryNames);
  const roots = new Map<string, CategoryNode>();
  for (const category of sorted) {
    if (category.parentId === null) {
      roots.set(category.id, { ...category, children: [] });
    }
  }
  for (const category of sorted) {
    if (category.parentId !== null) {
      roots.get(category.parentId)?.children.push(category);
    }
  }
  return [...roots.values()];
}

export interface FlatCategoryOption {
  category: Category;
  /** 0 = top-level, 1 = child. */
  depth: 0 | 1;
}

/** Tree order (each parent followed by its children) for pickers and selects. */
export function flattenCategoryTree(categories: readonly Category[]): FlatCategoryOption[] {
  return buildCategoryTree(categories).flatMap(({ children, ...parent }) => [
    { category: parent, depth: 0 as const },
    ...children.map((child) => ({ category: child, depth: 1 as const })),
  ]);
}

/**
 * Top-level categories of `type` that can be the parent of a new category, or of `editing`.
 * Empty when `editing` has children: the tree has two levels at most.
 * Mirrors the server rules, so the form only offers valid choices.
 */
export function parentCandidates(
  categories: readonly Category[],
  type: CategoryType,
  editing?: Category,
): Category[] {
  if (editing && categories.some((category) => category.parentId === editing.id)) {
    return [];
  }
  return categories.filter(
    (category) =>
      category.parentId === null && category.type === type && category.id !== editing?.id,
  );
}

/**
 * Categories that can receive the transactions of `deleting`: same type, and not `deleting`
 * or one of its children (they are deleted with it).
 */
export function replacementCandidates(
  categories: readonly Category[],
  deleting: Category,
): Category[] {
  return categories.filter(
    (category) =>
      category.type === deleting.type &&
      category.id !== deleting.id &&
      category.parentId !== deleting.id,
  );
}

export const CATEGORY_TYPE_LABELS: Record<CategoryType, string> = {
  INCOME: "Thu",
  EXPENSE: "Chi",
};
