import {
  createTransactionRequestSchema,
  type CreateTransactionRequest,
  type TransactionType,
  type UpdateTransactionRequest,
  type ValidationIssue,
} from "@finance/shared";

import { toValidationIssues } from "../common/validation.js";

/** The editable fields of a stored transaction, in request form (amount as number, ISO time). */
export interface StoredTransactionFields {
  type: TransactionType;
  amount: number;
  walletId: string;
  toWalletId: string | null;
  categoryId: string | null;
  note: string | null;
  occurredAt: string;
}

export type MergeResult =
  { success: true; data: CreateTransactionRequest } | { success: false; issues: ValidationIssue[] };

/**
 * Applies a PATCH to a stored transaction and validates the result with the CREATE schema,
 * so an edited transaction obeys exactly the same rules as a new one.
 *
 * When the type changes, the field of the old type is dropped: an expense that becomes a
 * transfer loses its category (and must now have `toWalletId`), and the other way round.
 * Sending the field of the other type explicitly is an error rather than silently ignored.
 */
export function mergeTransactionUpdate(
  stored: StoredTransactionFields,
  patch: UpdateTransactionRequest,
): MergeResult {
  const type = patch.type ?? stored.type;

  if (type === "TRANSFER" && patch.categoryId) {
    return {
      success: false,
      issues: [{ path: "categoryId", message: "Giao dịch chuyển ví không có danh mục" }],
    };
  }
  if (type !== "TRANSFER" && patch.toWalletId) {
    return {
      success: false,
      issues: [{ path: "toWalletId", message: "Chỉ giao dịch chuyển ví mới có ví nhận" }],
    };
  }

  const common = {
    type,
    amount: patch.amount ?? stored.amount,
    walletId: patch.walletId ?? stored.walletId,
    occurredAt: patch.occurredAt ?? stored.occurredAt,
    note: patch.note !== undefined ? patch.note : stored.note,
  };
  const merged =
    type === "TRANSFER"
      ? {
          ...common,
          toWalletId: patch.toWalletId !== undefined ? patch.toWalletId : stored.toWalletId,
        }
      : {
          ...common,
          categoryId: patch.categoryId !== undefined ? patch.categoryId : stored.categoryId,
        };

  const result = createTransactionRequestSchema.safeParse(merged);
  return result.success
    ? { success: true, data: result.data }
    : { success: false, issues: toValidationIssues(result.error.issues) };
}
