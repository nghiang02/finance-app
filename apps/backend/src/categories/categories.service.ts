import { randomUUID } from "node:crypto";

import { DEFAULT_CATEGORIES } from "@finance/shared";
import { Injectable } from "@nestjs/common";

import type { Prisma } from "../generated/prisma/client.js";

@Injectable()
export class CategoriesService {
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
}
