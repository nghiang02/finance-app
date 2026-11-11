import { describe, expect, it } from "vitest";

import { DEFAULT_CATEGORIES } from "./constants.js";
import { categoryTypeSchema, hexColorSchema } from "./schemas/category.js";

describe("DEFAULT_CATEGORIES", () => {
  it("has both income and expense categories", () => {
    const types = new Set(DEFAULT_CATEGORIES.map((category) => category.type));
    expect(types).toEqual(new Set(["INCOME", "EXPENSE"]));
  });

  it("uses valid types and #RRGGBB colors", () => {
    for (const category of DEFAULT_CATEGORIES) {
      expect(categoryTypeSchema.safeParse(category.type).success).toBe(true);
      expect(hexColorSchema.safeParse(category.color).success, category.name).toBe(true);
    }
  });

  it("has no duplicate names among top-level categories of the same type", () => {
    const keys = DEFAULT_CATEGORIES.map((category) => `${category.type}:${category.name}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("has no duplicate names inside one parent, and every entry has a name and an icon", () => {
    for (const category of DEFAULT_CATEGORIES) {
      expect(category.name.trim()).not.toBe("");
      expect(category.icon).not.toBe("");
      const childNames = (category.children ?? []).map((child) => child.name);
      expect(new Set(childNames).size, category.name).toBe(childNames.length);
      for (const child of category.children ?? []) {
        expect(child.name.trim()).not.toBe("");
        expect(child.icon).not.toBe("");
      }
    }
  });
});
