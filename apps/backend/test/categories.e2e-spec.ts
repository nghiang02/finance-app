import {
  apiErrorResponseSchema,
  buildCategoryTree,
  type Category,
  categoryInUseDetailsSchema,
  categoryListSchema,
  categorySchema,
  DEFAULT_CATEGORIES,
  validationErrorDetailsSchema,
} from "@finance/shared";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createTestApp, registerUser, type TestApp, type TestUser } from "./support.js";
import { getTestDatabaseUrl } from "./test-database.js";

const databaseUrl = getTestDatabaseUrl();
const MISSING_ID = "6f1c2d9e-8a4b-4c3d-9e2f-1a2b3c4d5e6f";

describe.skipIf(!databaseUrl)("Categories (integration, real database)", () => {
  let t: TestApp;
  let an: TestUser;
  let binh: TestUser;

  beforeEach(async () => {
    t = await createTestApp(databaseUrl ?? "");
    an = await registerUser(t, "an@example.com");
    binh = await registerUser(t, "binh@example.com");
  });

  afterEach(async () => {
    await t.app.close();
  });

  async function listCategories(user: TestUser): Promise<Category[]> {
    const res = await t
      .http()
      .get("/api/v1/categories")
      .set("Authorization", user.auth)
      .expect(200);
    return categoryListSchema.parse(res.body);
  }

  async function findCategory(user: TestUser, name: string): Promise<Category> {
    const category = (await listCategories(user)).find((c) => c.name === name);
    if (!category) {
      throw new Error(`Category ${name} not found`);
    }
    return category;
  }

  function createCategory(user: TestUser, body: Record<string, unknown>) {
    return t.http().post("/api/v1/categories").set("Authorization", user.auth).send(body);
  }

  function updateCategory(user: TestUser, id: string, body: Record<string, unknown>) {
    return t.http().patch(`/api/v1/categories/${id}`).set("Authorization", user.auth).send(body);
  }

  function deleteCategory(user: TestUser, id: string, replacementId?: string) {
    return t
      .http()
      .delete(`/api/v1/categories/${id}`)
      .query(replacementId ? { replacementId } : {})
      .set("Authorization", user.auth);
  }

  function issuePaths(body: unknown): string[] {
    const { error } = apiErrorResponseSchema.parse(body);
    expect(error.code).toBe("VALIDATION_ERROR");
    return validationErrorDetailsSchema.parse(error.details).issues.map((issue) => issue.path);
  }

  /** Transactions CRUD comes in phase 3; insert rows directly. */
  async function addExpense(
    user: TestUser,
    categoryId: string,
    options: { deleted?: boolean } = {},
  ) {
    const wallet =
      (await t.prisma.wallet.findFirst({ where: { userId: user.id } })) ??
      (await t.prisma.wallet.create({ data: { userId: user.id, name: "Tiền mặt", type: "CASH" } }));
    return t.prisma.transaction.create({
      data: {
        userId: user.id,
        type: "EXPENSE",
        amount: 50_000n,
        walletId: wallet.id,
        categoryId,
        occurredAt: new Date(),
        deletedAt: options.deleted ? new Date() : null,
      },
    });
  }

  describe("list", () => {
    it("returns the default categories as a flat list that builds a tree", async () => {
      const categories = await listCategories(an);
      const total = DEFAULT_CATEGORIES.reduce((n, c) => n + 1 + (c.children?.length ?? 0), 0);

      expect(categories).toHaveLength(total);
      const tree = buildCategoryTree(categories);
      expect(tree).toHaveLength(DEFAULT_CATEGORIES.length);
      const food = tree.find((node) => node.name === "Ăn uống");
      expect(food?.children.map((child) => child.name).sort()).toEqual(["Cà phê", "Đi chợ"]);
    });

    it("requires a signed-in user", async () => {
      await t.http().get("/api/v1/categories").expect(401);
    });
  });

  describe("create", () => {
    it("creates a top-level category", async () => {
      const res = await createCategory(an, {
        name: "Thú cưng",
        type: "EXPENSE",
        icon: "🐶",
        color: "#22c55e",
      });

      expect(res.status).toBe(201);
      expect(categorySchema.parse(res.body)).toMatchObject({
        name: "Thú cưng",
        type: "EXPENSE",
        icon: "🐶",
        color: "#22C55E",
        parentId: null,
      });
    });

    it("creates a child that inherits the parent's color", async () => {
      const food = await findCategory(an, "Ăn uống");
      const res = await createCategory(an, { name: "Trà sữa", type: "EXPENSE", parentId: food.id });

      expect(res.status).toBe(201);
      expect(categorySchema.parse(res.body)).toMatchObject({
        parentId: food.id,
        color: food.color,
        icon: null,
      });
    });

    it("rejects a parent of the other type, a child as parent and a missing parent", async () => {
      const salary = await findCategory(an, "Lương");
      const coffee = await findCategory(an, "Cà phê");

      for (const parentId of [salary.id, coffee.id, MISSING_ID]) {
        const res = await createCategory(an, { name: "x", type: "EXPENSE", parentId });
        expect(res.status).toBe(400);
        expect(issuePaths(res.body)).toEqual(["parentId"]);
      }
    });

    it("does not accept another user's category as parent", async () => {
      const binhFood = await findCategory(binh, "Ăn uống");
      const res = await createCategory(an, { name: "x", type: "EXPENSE", parentId: binhFood.id });

      expect(res.status).toBe(400);
      expect(issuePaths(res.body)).toEqual(["parentId"]);
    });
  });

  describe("update", () => {
    it("renames, clears the icon and recolors", async () => {
      const food = await findCategory(an, "Ăn uống");
      const res = await updateCategory(an, food.id, {
        name: "Ăn ngoài",
        icon: null,
        color: "#000000",
      });

      expect(res.status).toBe(200);
      expect(categorySchema.parse(res.body)).toMatchObject({
        id: food.id,
        name: "Ăn ngoài",
        icon: null,
        color: "#000000",
      });
    });

    it("moves a child to top level and to another parent of the same type", async () => {
      const coffee = await findCategory(an, "Cà phê");
      const transport = await findCategory(an, "Di chuyển");

      const toRoot = await updateCategory(an, coffee.id, { parentId: null });
      expect(categorySchema.parse(toRoot.body).parentId).toBeNull();

      const moved = await updateCategory(an, coffee.id, { parentId: transport.id });
      expect(categorySchema.parse(moved.body).parentId).toBe(transport.id);
    });

    it("keeps the tree at two levels and rejects itself as parent", async () => {
      const food = await findCategory(an, "Ăn uống"); // has children
      const transport = await findCategory(an, "Di chuyển");
      const shopping = await findCategory(an, "Mua sắm");

      const withChildren = await updateCategory(an, food.id, { parentId: transport.id });
      expect(withChildren.status).toBe(400);
      expect(issuePaths(withChildren.body)).toEqual(["parentId"]);

      const self = await updateCategory(an, shopping.id, { parentId: shopping.id });
      expect(self.status).toBe(400);
      expect(issuePaths(self.body)).toEqual(["parentId"]);
    });

    it("does not allow changing the type", async () => {
      const food = await findCategory(an, "Ăn uống");
      const res = await updateCategory(an, food.id, { type: "INCOME" });

      expect(res.status).toBe(400);
    });

    it("answers 404 for another user's category", async () => {
      const food = await findCategory(an, "Ăn uống");
      const res = await updateCategory(binh, food.id, { name: "hacked" });

      expect(res.status).toBe(404);
      expect((await findCategory(an, "Ăn uống")).name).toBe("Ăn uống");
    });
  });

  describe("delete", () => {
    it("soft-deletes an unused category and its children", async () => {
      const food = await findCategory(an, "Ăn uống");

      await deleteCategory(an, food.id).expect(204);

      const names = (await listCategories(an)).map((c) => c.name);
      expect(names).not.toContain("Ăn uống");
      expect(names).not.toContain("Cà phê");
      const row = await t.prisma.category.findUniqueOrThrow({ where: { id: food.id } });
      expect(row.deletedAt).not.toBeNull();
      await deleteCategory(an, food.id).expect(404);
    });

    it("answers 409 with the count when in use and changes nothing", async () => {
      const food = await findCategory(an, "Ăn uống");
      const coffee = await findCategory(an, "Cà phê");
      await addExpense(an, food.id);
      await addExpense(an, coffee.id);
      await addExpense(an, coffee.id, { deleted: true }); // not counted

      const res = await deleteCategory(an, food.id);

      expect(res.status).toBe(409);
      const { error } = apiErrorResponseSchema.parse(res.body);
      expect(categoryInUseDetailsSchema.parse(error.details)).toEqual({
        reason: "CATEGORY_IN_USE",
        transactionCount: 2,
      });
      expect((await listCategories(an)).map((c) => c.id)).toEqual(
        expect.arrayContaining([food.id, coffee.id]),
      );
    });

    it("moves transactions of the category and its children to the replacement", async () => {
      const food = await findCategory(an, "Ăn uống");
      const coffee = await findCategory(an, "Cà phê");
      const other = await findCategory(an, "Chi khác");
      const first = await addExpense(an, food.id);
      const second = await addExpense(an, coffee.id);
      const budget = await t.prisma.budget.create({
        data: { userId: an.id, categoryId: food.id, month: "2026-11", limit: 1_000_000n },
      });

      await deleteCategory(an, food.id, other.id).expect(204);

      const moved = await t.prisma.transaction.findMany({
        where: { id: { in: [first.id, second.id] } },
      });
      expect(moved.map((tx) => tx.categoryId)).toEqual([other.id, other.id]);
      const deletedBudget = await t.prisma.budget.findUniqueOrThrow({ where: { id: budget.id } });
      expect(deletedBudget.deletedAt).not.toBeNull();
    });

    it("rejects a replacement that is deleted with it, of the other type or not the user's", async () => {
      const food = await findCategory(an, "Ăn uống");
      const coffee = await findCategory(an, "Cà phê");
      const salary = await findCategory(an, "Lương");
      const binhOther = await findCategory(binh, "Chi khác");
      await addExpense(an, food.id);

      for (const replacementId of [coffee.id, salary.id, binhOther.id]) {
        const res = await deleteCategory(an, food.id, replacementId);
        expect(res.status).toBe(400);
        expect(issuePaths(res.body)).toEqual(["replacementId"]);
      }
      expect((await listCategories(an)).map((c) => c.id)).toContain(food.id);
    });

    it("answers 404 for another user's category and 400 for a bad id", async () => {
      const food = await findCategory(an, "Ăn uống");

      await deleteCategory(binh, food.id).expect(404);
      await deleteCategory(an, "not-a-uuid").expect(400);
      await deleteCategory(an, food.id, "not-a-uuid").expect(400);
    });
  });
});
