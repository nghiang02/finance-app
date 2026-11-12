import {
  type CreateTransactionRequest,
  monthRange,
  type Transaction as TransactionDto,
  type TransactionListQuery,
  type TransactionPage,
  type UpdateTransactionRequest,
} from "@finance/shared";
import { HttpStatus, Injectable } from "@nestjs/common";

import { ApiException } from "../common/api-exception.js";
import { lockCategory, lockWallet, type LockedWallet } from "../common/locks.js";
import { moneyToBigInt, moneyToNumber } from "../common/money.js";
import { fieldError, validationError } from "../common/validation.js";
import type { Prisma, Transaction } from "../generated/prisma/client.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { decodeCursor, encodeCursor } from "./cursor.js";
import { mergeTransactionUpdate, type StoredTransactionFields } from "./merge.js";

function toTransactionDto(row: Transaction): TransactionDto {
  return {
    id: row.id,
    type: row.type,
    amount: moneyToNumber(row.amount),
    walletId: row.walletId,
    toWalletId: row.toWalletId,
    categoryId: row.categoryId,
    note: row.note,
    occurredAt: row.occurredAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toStoredFields(row: Transaction): StoredTransactionFields {
  return {
    type: row.type,
    amount: moneyToNumber(row.amount),
    walletId: row.walletId,
    toWalletId: row.toWalletId,
    categoryId: row.categoryId,
    note: row.note,
    occurredAt: row.occurredAt.toISOString(),
  };
}

/** Request → columns. The field of the other type is always null (matches the CHECK constraint). */
function toColumns(input: CreateTransactionRequest) {
  return {
    type: input.type,
    amount: moneyToBigInt(input.amount),
    walletId: input.walletId,
    toWalletId: input.type === "TRANSFER" ? input.toWalletId : null,
    categoryId: input.type === "TRANSFER" ? null : input.categoryId,
    // Parsed from an ISO string with offset: a Date is an instant, stored as timestamptz (UTC).
    occurredAt: new Date(input.occurredAt),
    note: input.note ?? null,
  };
}

function transactionNotFound(): ApiException {
  // Same answer for "does not exist" and "belongs to someone else".
  return new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Transaction not found");
}

/**
 * Wallet balances are computed from transactions (see WalletsService), so there is no balance
 * column to update here. What keeps balances right is that every write checks its wallets and
 * category and saves the row in ONE database transaction, with those rows share-locked: a wallet
 * or category being deleted at the same moment either waits for us or makes our check fail.
 */
@Injectable()
export class TransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * One page of a month's transactions, newest first. The month is the user's calendar month
   * (their time zone), turned into a UTC range for the query.
   */
  async list(userId: string, query: TransactionListQuery): Promise<TransactionPage> {
    const cursor = query.cursor === undefined ? undefined : decodeCursor(query.cursor);
    if (cursor === null) {
      throw fieldError("cursor", "Cursor không hợp lệ, hãy tải lại từ trang đầu");
    }

    const { timezone } = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { timezone: true },
    });
    const { start, end } = monthRange(query.month, timezone);

    const conditions: Prisma.TransactionWhereInput[] = [
      { userId, deletedAt: null, occurredAt: { gte: start, lt: end } },
    ];
    if (query.type) {
      conditions.push({ type: query.type });
    }
    if (query.walletId) {
      // A wallet's history includes transfers that arrive in it.
      conditions.push({ OR: [{ walletId: query.walletId }, { toWalletId: query.walletId }] });
    }
    if (query.categoryId) {
      // Filtering by "Ăn uống" also shows "Cà phê" and "Đi chợ".
      conditions.push({
        OR: [{ categoryId: query.categoryId }, { category: { parentId: query.categoryId } }],
      });
    }
    if (query.q) {
      conditions.push({
        OR: [
          { note: { contains: query.q, mode: "insensitive" } },
          { category: { name: { contains: query.q, mode: "insensitive" } } },
        ],
      });
    }
    if (cursor) {
      // Rows strictly after the cursor in (occurredAt DESC, id DESC) order.
      conditions.push({
        OR: [
          { occurredAt: { lt: cursor.occurredAt } },
          { occurredAt: cursor.occurredAt, id: { lt: cursor.id } },
        ],
      });
    }

    // One extra row tells whether there is a next page without a COUNT query.
    const rows = await this.prisma.transaction.findMany({
      where: { AND: conditions },
      orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
      take: query.limit + 1,
    });
    const items = rows.slice(0, query.limit);
    const last = items.at(-1);
    return {
      items: items.map(toTransactionDto),
      nextCursor:
        rows.length > query.limit && last
          ? encodeCursor({ occurredAt: last.occurredAt, id: last.id })
          : null,
    };
  }

  async get(userId: string, id: string): Promise<TransactionDto> {
    const row = await this.prisma.transaction.findFirst({ where: { id, userId, deletedAt: null } });
    if (!row) {
      throw transactionNotFound();
    }
    return toTransactionDto(row);
  }

  async create(userId: string, input: CreateTransactionRequest): Promise<TransactionDto> {
    return this.prisma.$transaction(async (tx) => {
      await this.checkReferences(tx, userId, input, null);
      const row = await tx.transaction.create({ data: { userId, ...toColumns(input) } });
      return toTransactionDto(row);
    });
  }

  async update(
    userId: string,
    id: string,
    patch: UpdateTransactionRequest,
  ): Promise<TransactionDto> {
    return this.prisma.$transaction(async (tx) => {
      const stored = await tx.transaction.findFirst({ where: { id, userId, deletedAt: null } });
      if (!stored) {
        throw transactionNotFound();
      }
      const merged = mergeTransactionUpdate(toStoredFields(stored), patch);
      if (!merged.success) {
        throw validationError(merged.issues);
      }
      await this.checkReferences(tx, userId, merged.data, stored);
      // The findFirst above proved ownership, so `where: { id }` is safe.
      const row = await tx.transaction.update({ where: { id }, data: toColumns(merged.data) });
      return toTransactionDto(row);
    });
  }

  /** Soft delete: the wallet balance and reports stop counting it immediately. */
  async remove(userId: string, id: string): Promise<void> {
    const { count } = await this.prisma.transaction.updateMany({
      where: { id, userId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    if (count === 0) {
      throw transactionNotFound();
    }
  }

  /**
   * Rules that need the database. Errors use the field name as path, so forms show them
   * next to the right input. Another user's wallet or category answers "does not exist".
   */
  private async checkReferences(
    tx: Prisma.TransactionClient,
    userId: string,
    input: CreateTransactionRequest,
    stored: Transaction | null,
  ): Promise<void> {
    const wallet = await this.checkWallet(tx, userId, input.walletId, "walletId", stored?.walletId);

    if (input.type === "TRANSFER") {
      const destination = await this.checkWallet(
        tx,
        userId,
        input.toWalletId,
        "toWalletId",
        stored?.toWalletId,
      );
      // No exchange rates yet (multi-currency is after the MVP): one amount must mean
      // the same money in both wallets.
      if (destination.currency !== wallet.currency) {
        throw fieldError("toWalletId", "Hai ví phải cùng loại tiền tệ");
      }
      return;
    }

    const category = await lockCategory(tx, userId, input.categoryId, "share");
    if (!category) {
      throw fieldError("categoryId", "Danh mục không tồn tại");
    }
    if (category.type !== input.type) {
      throw fieldError(
        "categoryId",
        input.type === "INCOME"
          ? "Hãy chọn một danh mục khoản thu"
          : "Hãy chọn một danh mục khoản chi",
      );
    }
  }

  /**
   * The wallet must exist and belong to the user. An archived wallet cannot RECEIVE a
   * transaction, but an existing transaction already in it can still be edited.
   */
  private async checkWallet(
    tx: Prisma.TransactionClient,
    userId: string,
    walletId: string,
    path: "walletId" | "toWalletId",
    previousId: string | null | undefined,
  ): Promise<LockedWallet> {
    const wallet = await lockWallet(tx, userId, walletId);
    if (!wallet) {
      throw fieldError(path, "Ví không tồn tại");
    }
    if (wallet.archived && walletId !== previousId) {
      throw fieldError(path, "Ví đã được lưu trữ. Bỏ lưu trữ ví trước khi ghi giao dịch.");
    }
    return wallet;
  }
}
