import { describe, expect, it } from "vitest";

import {
  buildCategoryTree,
  type Category,
  categoryInUseDetailsSchema,
  createCategoryRequestSchema,
  deleteCategoryQuerySchema,
  updateCategoryRequestSchema,
} from "./category.js";

const PARENT_ID = "6f1c2d9e-8a4b-4c3d-9e2f-1a2b3c4d5e6f";

function category(overrides: Partial<Category>): Category {
  return {
    id: "00000000-0000-4000-8000-000000000000",
    name: "x",
    type: "EXPENSE",
    icon: null,
    color: null,
    parentId: null,
    createdAt: "2026-11-12T01:00:00.000Z",
    updatedAt: "2026-11-12T01:00:00.000Z",
    ...overrides,
  };
}

describe("createCategoryRequestSchema", () => {
  it("trims the name and upper-cases the color", () => {
    expect(
      createCategoryRequestSchema.parse({ name: "  Thú cưng ", type: "EXPENSE", color: "#f97316" }),
    ).toEqual({ name: "Thú cưng", type: "EXPENSE", color: "#F97316" });
  });

  it("accepts a child with icon and parent", () => {
    const result = createCategoryRequestSchema.safeParse({
      name: "Trà sữa",
      type: "EXPENSE",
      icon: "🧋",
      parentId: PARENT_ID,
    });
    expect(result.success).toBe(true);
  });

  it.each([
    ["empty name", { name: "  ", type: "EXPENSE" }],
    ["unknown type", { name: "x", type: "TRANSFER" }],
    ["bad color", { name: "x", type: "EXPENSE", color: "orange" }],
    ["bad parent id", { name: "x", type: "EXPENSE", parentId: "123" }],
    ["unknown field", { name: "x", type: "EXPENSE", userId: PARENT_ID }],
  ])("rejects %s", (_, body) => {
    expect(createCategoryRequestSchema.safeParse(body).success).toBe(false);
  });
});

describe("updateCategoryRequestSchema", () => {
  it("allows clearing icon, color and parent with null", () => {
    expect(updateCategoryRequestSchema.parse({ icon: null, color: null, parentId: null })).toEqual({
      icon: null,
      color: null,
      parentId: null,
    });
  });

  it("rejects an empty update and a type change", () => {
    expect(updateCategoryRequestSchema.safeParse({}).success).toBe(false);
    expect(updateCategoryRequestSchema.safeParse({ type: "INCOME" }).success).toBe(false);
  });
});

describe("deleteCategoryQuerySchema", () => {
  it("makes the replacement optional but checks its format", () => {
    expect(deleteCategoryQuerySchema.parse({})).toEqual({});
    expect(deleteCategoryQuerySchema.safeParse({ replacementId: "abc" }).success).toBe(false);
  });
});

describe("categoryInUseDetailsSchema", () => {
  it("parses the 409 details", () => {
    expect(
      categoryInUseDetailsSchema.parse({ reason: "CATEGORY_IN_USE", transactionCount: 3 }),
    ).toEqual({ reason: "CATEGORY_IN_USE", transactionCount: 3 });
  });
});

describe("buildCategoryTree", () => {
  it("nests children under their parent and keeps the order", () => {
    const food = category({ id: "a", name: "Ăn uống" });
    const coffee = category({ id: "b", name: "Cà phê", parentId: "a" });
    const salary = category({ id: "c", name: "Lương", type: "INCOME" });
    const market = category({ id: "d", name: "Đi chợ", parentId: "a" });

    expect(buildCategoryTree([coffee, food, salary, market])).toEqual([
      { ...food, children: [coffee, market] },
      { ...salary, children: [] },
    ]);
  });

  it("drops children whose parent is not in the list", () => {
    expect(buildCategoryTree([category({ id: "b", parentId: "missing" })])).toEqual([]);
  });
});
