import type {
  CreateTransactionRequest,
  Transaction as TransactionDto,
  UpdateTransactionRequest,
} from "@finance/shared";
import { HttpStatus, Injectable } from "@nestjs/common";

import { ApiException } from "../common/api-exception.js";
import { lockCategory, lockWallet, type LockedWallet } from "../common/locks.js";
import { moneyToBigInt, moneyToNumber } from "../common/money.js";
import { fieldError, validationError } from "../common/validation.js";
import type { Prisma, Transaction } from "../generated/prisma/client.js";
import { PrismaService } from "../prisma/prisma.service.js";
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
