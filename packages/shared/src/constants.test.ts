import { describe, expect, it } from "vitest";

import { CATEGORY_COLORS, CATEGORY_ICON_SUGGESTIONS, DEFAULT_CATEGORIES } from "./constants.js";
import { categoryIconSchema, categoryTypeSchema, hexColorSchema } from "./schemas/category.js";
import { WALLET_TYPE_COLORS, WALLET_TYPES } from "./schemas/wallet.js";

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

describe("CATEGORY_COLORS", () => {
  it("are valid, unique and include every default color", () => {
    for (const color of CATEGORY_COLORS) {
      expect(hexColorSchema.parse(color)).toBe(color);
    }
    expect(new Set(CATEGORY_COLORS).size).toBe(CATEGORY_COLORS.length);
    for (const category of DEFAULT_CATEGORIES) {
      expect(CATEGORY_COLORS).toContain(category.color);
    }
  });
});

describe("UI constants", () => {
  it("suggests unique, valid category icons", () => {
    for (const icon of CATEGORY_ICON_SUGGESTIONS) {
      expect(categoryIconSchema.safeParse(icon).success, icon).toBe(true);
    }
    expect(new Set(CATEGORY_ICON_SUGGESTIONS).size).toBe(CATEGORY_ICON_SUGGESTIONS.length);
  });

  it("has a valid color for every wallet type", () => {
    for (const type of WALLET_TYPES) {
      expect(hexColorSchema.parse(WALLET_TYPE_COLORS[type])).toBe(WALLET_TYPE_COLORS[type]);
    }
  });
});
