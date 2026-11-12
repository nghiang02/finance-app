import type { CategoryType } from "@finance/shared";

import type { Prisma } from "../generated/prisma/client.js";

/**
 * Row locks for checks that must still hold when the transaction commits.
 *
 * Prisma has no API for row locks, hence raw SQL (parameterized by the tagged template,
 * so values are never concatenated into the query). Both helpers only return active rows
 * of the user: `deletedAt IS NULL AND "userId" = ...`.
 *
 * - "update" (FOR UPDATE): the row is about to change; others wait to lock or change it.
 * - "share" (FOR SHARE): the row must stay as read (e.g. the wallet a transaction is written
 *   to); others can still read it, but a concurrent update or delete of it waits for us.
 * A waiting statement re-checks `deletedAt IS NULL` afterwards, so it never acts on a row
 * that was deleted meanwhile.
 */
export type LockMode = "update" | "share";

export interface LockedCategory {
  id: string;
  type: CategoryType;
  parentId: string | null;
  color: string | null;
}

export async function lockCategory(
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

export interface LockedWallet {
  id: string;
  currency: string;
  archived: boolean;
}

/** Wallets are only ever share-locked: transactions read them, wallet edits use UPDATE. */
export async function lockWallet(
  tx: Prisma.TransactionClient,
  userId: string,
  id: string,
): Promise<LockedWallet | null> {
  const rows = await tx.$queryRaw<LockedWallet[]>`
    SELECT "id", "currency", "archived"
    FROM "Wallet"
    WHERE "id" = ${id} AND "userId" = ${userId} AND "deletedAt" IS NULL
    FOR SHARE`;
  return rows[0] ?? null;
}
