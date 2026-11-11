import { describe, expect, it, vi } from "vitest";

import { createApiClient } from "./client.js";
import { categoryInUse } from "./errors.js";

const CATEGORY = {
  id: "6f1c2d9e-8a4b-4c3d-9e2f-1a2b3c4d5e6f",
  name: "Ăn uống",
  type: "EXPENSE",
  icon: "🍜",
  color: "#F97316",
  parentId: null,
  createdAt: "2026-11-12T01:00:00.000Z",
  updatedAt: "2026-11-12T01:00:00.000Z",
};
const REPLACEMENT_ID = "0b6f7c1e-2d3a-4b5c-8d9e-0f1a2b3c4d5e";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function setup(response: Response) {
  const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(response);
  const client = createApiClient({ baseUrl: "http://api.test/api/v1", fetch: fetchMock });
  const call = () => {
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    return { url, method: init?.method, body: init?.body };
  };
  return { client, call };
}

describe("categories endpoints", () => {
  it("lists, creates and updates", async () => {
    const listed = setup(json([CATEGORY]));
    await expect(listed.client.categories.list()).resolves.toEqual([CATEGORY]);
    expect(listed.call()).toMatchObject({ url: "http://api.test/api/v1/categories" });

    const created = setup(json(CATEGORY, 201));
    await created.client.categories.create({ name: "Ăn uống", type: "EXPENSE" });
    expect(created.call()).toMatchObject({ method: "POST" });

    const updated = setup(json({ ...CATEGORY, parentId: null }));
    await updated.client.categories.update(CATEGORY.id, { parentId: null });
    expect(updated.call()).toMatchObject({
      url: `http://api.test/api/v1/categories/${CATEGORY.id}`,
      method: "PATCH",
      body: '{"parentId":null}',
    });
  });

  it("sends the replacement only when given", async () => {
    const plain = setup(new Response(null, { status: 204 }));
    await plain.client.categories.remove(CATEGORY.id);
    expect(plain.call().url).toBe(`http://api.test/api/v1/categories/${CATEGORY.id}`);

    const replaced = setup(new Response(null, { status: 204 }));
    await replaced.client.categories.remove(CATEGORY.id, REPLACEMENT_ID);
    expect(replaced.call()).toMatchObject({
      url: `http://api.test/api/v1/categories/${CATEGORY.id}?replacementId=${REPLACEMENT_ID}`,
      method: "DELETE",
    });
  });

  it("exposes the 409 details of a category in use", async () => {
    const { client } = setup(
      json(
        {
          error: {
            code: "CONFLICT",
            message: "Category has transactions; choose a replacement category",
            details: { reason: "CATEGORY_IN_USE", transactionCount: 4 },
          },
        },
        409,
      ),
    );

    const error: unknown = await client.categories.remove(CATEGORY.id).catch((e: unknown) => e);
    expect(categoryInUse(error)).toEqual({ reason: "CATEGORY_IN_USE", transactionCount: 4 });
    expect(categoryInUse(new Error("other"))).toBeNull();
  });
});
