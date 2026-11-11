import { randomUUID } from "node:crypto";

import {
  type Category as CategoryDto,
  type CategoryInUseDetails,
  type CategoryType,
  type CreateCategoryRequest,
  DEFAULT_CATEGORIES,
  type UpdateCategoryRequest,
} from "@finance/shared";
import { HttpStatus, Injectable } from "@nestjs/common";

import { ApiException } from "../common/api-exception.js";
import { fieldError } from "../common/validation.js";
import type { Category, Prisma } from "../generated/prisma/client.js";
import { PrismaService } from "../prisma/prisma.service.js";

function toCategoryDto(category: Category): CategoryDto {
  return {
    id: category.id,
    name: category.name,
    type: category.type,
    icon: category.icon,
    color: category.color,
    parentId: category.parentId,
    createdAt: category.createdAt.toISOString(),
    updatedAt: category.updatedAt.toISOString(),
  };
}

function categoryNotFound(): ApiException {
  // Same answer for "does not exist" and "belongs to someone else".
  return new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Category not found");
}

/** The columns the business rules need, read with a row lock. */
interface LockedCategory {
  id: string;
  type: CategoryType;
  parentId: string | null;
  color: string | null;
}

type LockMode = "update" | "share";

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Flat list, top-level and children together. Clients nest it with `buildCategoryTree`.
   * Parents come first so the tree keeps them in name order.
   */
  async list(userId: string): Promise<CategoryDto[]> {
    const categories = await this.prisma.category.findMany({
      where: { userId, deletedAt: null },
      orderBy: [{ type: "asc" }, { name: "asc" }],
    });
    return categories.map(toCategoryDto);
  }

  async create(userId: string, input: CreateCategoryRequest): Promise<CategoryDto> {
    const parentId = input.parentId ?? null;
    if (parentId === null) {
      const category = await this.prisma.category.create({
        data: {
          userId,
          name: input.name,
          type: input.type,
          icon: input.icon ?? null,
          color: input.color ?? null,
        },
      });
      return toCategoryDto(category);
    }

    return this.prisma.$transaction(async (tx) => {
      // Locked so the parent cannot be deleted or moved until this child is saved.
      const parent = await this.lockParent(tx, userId, parentId, input.type);
      const category = await tx.category.create({
        data: {
          userId,
          parentId,
          name: input.name,
          type: input.type,
          icon: input.icon ?? null,
          color: input.color === undefined ? parent.color : input.color,
        },
      });
      return toCategoryDto(category);
    });
  }

  async update(userId: string, id: string, input: UpdateCategoryRequest): Promise<CategoryDto> {
    return this.prisma.$transaction(async (tx) => {
      const current = await this.lockCategory(tx, userId, id, "update");
      if (!current) {
        throw categoryNotFound();
      }

      const newParentId = input.parentId;
      if (newParentId !== undefined && newParentId !== null && newParentId !== current.parentId) {
        if (newParentId === id) {
          throw fieldError("parentId", "Không thể chọn chính danh mục này làm danh mục cha");
        }
        await this.lockParent(tx, userId, newParentId, current.type);
        // Two levels at most: a category that has children cannot become a child.
        const childCount = await tx.category.count({
          where: { userId, parentId: id, deletedAt: null },
        });
        if (childCount > 0) {
          throw fieldError(
            "parentId",
            "Danh mục đang có danh mục con nên không thể chuyển thành danh mục con",
          );
        }
      }

      // The lock above proved the category belongs to the user, so `where: { id }` is safe.
      const category = await tx.category.update({
        where: { id },
        data: {
          ...(input.name !== undefined && { name: input.name }),
          ...(input.icon !== undefined && { icon: input.icon }),
          ...(input.color !== undefined && { color: input.color }),
          ...(newParentId !== undefined && { parentId: newParentId }),
        },
      });
      return toCategoryDto(category);
    });
  }

  /**
   * Soft-deletes the category and its children (docs/PROJECT_CONTEXT.md):
   * - their active transactions move to `replacementId`, so past reports keep the amounts;
   * - without a replacement, a category in use answers 409 CATEGORY_IN_USE with the count,
   *   so the UI can ask the user to pick one;
   * - their budgets are soft-deleted: a budget on a category that no longer exists means nothing.
   * All of it in one transaction: either everything happens or nothing does.
   */
  async remove(userId: string, id: string, replacementId: string | undefined): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const target = await this.lockCategory(tx, userId, id, "update");
      if (!target) {
        throw categoryNotFound();
      }

      const children = await tx.category.findMany({
        where: { userId, parentId: id, deletedAt: null },
        select: { id: true },
      });
      const ids = [id, ...children.map((child) => child.id)];
      const now = new Date();

      // Soft-delete first: from here on the rows are locked, so a transaction created
      // concurrently either commits before (and is moved below) or sees the category deleted.
      await tx.category.updateMany({
        where: { id: { in: ids } },
        data: { deletedAt: now },
      });

      const transactionCount = await tx.transaction.count({
        where: { userId, deletedAt: null, categoryId: { in: ids } },
      });
      if (transactionCount > 0) {
        if (replacementId === undefined) {
          const details: CategoryInUseDetails = { reason: "CATEGORY_IN_USE", transactionCount };
          throw new ApiException(
            HttpStatus.CONFLICT,
            "CONFLICT",
            "Category has transactions; choose a replacement category",
            details,
          );
        }
        if (ids.includes(replacementId)) {
          throw fieldError(
            "replacementId",
            "Danh mục thay thế không được là danh mục đang xóa hoặc danh mục con của nó",
          );
        }
        const replacement = await this.lockCategory(tx, userId, replacementId, "share");
        if (!replacement) {
          throw fieldError("replacementId", "Danh mục thay thế không tồn tại");
        }
        if (replacement.type !== target.type) {
          throw fieldError("replacementId", "Danh mục thay thế phải cùng loại thu/chi");
        }
        await tx.transaction.updateMany({
          where: { userId, deletedAt: null, categoryId: { in: ids } },
          data: { categoryId: replacementId },
        });
      }

      await tx.budget.updateMany({
        where: { userId, deletedAt: null, categoryId: { in: ids } },
        data: { deletedAt: now },
      });
    });
  }

  /**
   * Creates the default categories for a new user. Takes the caller's transaction client,
   * so the user and its categories are saved together or not at all.
   *
   * Parent ids are generated here (not by the database) so parents and children can be
   * inserted with two batch inserts instead of one query per category.
   */
  async createDefaults(tx: Prisma.TransactionClient, userId: string): Promise<void> {
    const parents: Prisma.CategoryCreateManyInput[] = [];
    const children: Prisma.CategoryCreateManyInput[] = [];

    for (const category of DEFAULT_CATEGORIES) {
      const parentId = randomUUID();
      parents.push({
        id: parentId,
        userId,
        name: category.name,
        type: category.type,
        icon: category.icon,
        color: category.color,
      });
      for (const child of category.children ?? []) {
        children.push({
          userId,
          parentId,
          name: child.name,
          type: category.type,
          icon: child.icon,
          color: category.color,
        });
      }
    }

    await tx.category.createMany({ data: parents });
    await tx.category.createMany({ data: children });
  }

  /** The parent must exist, be top-level and have the same type as the child. */
  private async lockParent(
    tx: Prisma.TransactionClient,
    userId: string,
    parentId: string,
    childType: CategoryType,
  ): Promise<LockedCategory> {
    const parent = await this.lockCategory(tx, userId, parentId, "share");
    if (!parent) {
      throw fieldError("parentId", "Danh mục cha không tồn tại");
    }
    if (parent.parentId !== null) {
      throw fieldError("parentId", "Chỉ hỗ trợ 2 cấp: danh mục con không thể làm danh mục cha");
    }
    if (parent.type !== childType) {
      throw fieldError("parentId", "Danh mục con phải cùng loại thu/chi với danh mục cha");
    }
    return parent;
  }

  /**
   * Reads an active category of the user and locks its row until the transaction ends.
   * Prisma has no API for row locks, hence raw SQL (parameterized by the tagged template,
   * so the values are never concatenated into the query).
   *
   * - "update" (FOR UPDATE): the row is about to change; others wait to read-lock or change it.
   * - "share" (FOR SHARE): the row must stay as read (e.g. a parent); others can still read it,
   *   but a concurrent move or delete of it waits for us.
   * A waiting statement re-checks `deletedAt IS NULL` afterwards, so it never acts on a row
   * that was deleted meanwhile.
   */
  private async lockCategory(
    tx: Prisma.TransactionClient,
    userId: string,
    id: string,
    mode: LockMode,
  ): Promise<LockedCategory | null> {
    const rows =
      mode === "update"
        ? await tx.$queryRaw<LockedCategory[]>`
            SELECT "id", "type"::text AS "type", "parentId", "color"
            FROM "Category"
            WHERE "id" = ${id} AND "userId" = ${userId} AND "deletedAt" IS NULL
            FOR UPDATE`
        : await tx.$queryRaw<LockedCategory[]>`
            SELECT "id", "type"::text AS "type", "parentId", "color"
            FROM "Category"
            WHERE "id" = ${id} AND "userId" = ${userId} AND "deletedAt" IS NULL
            FOR SHARE`;
    return rows[0] ?? null;
  }
}
