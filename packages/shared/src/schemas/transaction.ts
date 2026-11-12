import { z } from "zod";

import { idSchema, moneySchema } from "./common.js";

export const TRANSACTION_TYPES = ["INCOME", "EXPENSE", "TRANSFER"] as const;
export const transactionTypeSchema = z.enum(TRANSACTION_TYPES);
export type TransactionType = z.infer<typeof transactionTypeSchema>;

/** A UUID reference with a clear message when it is missing (the form shows it as "pick one"). */
function referenceSchema(missingMessage: string) {
  return z.uuid({
    error: (issue) => (issue.input == null ? missingMessage : "Id không hợp lệ"),
  });
}

/** Always > 0: the type decides whether money comes in or goes out (docs/PROJECT_CONTEXT.md). */
export const transactionAmountSchema = moneySchema.refine(
  (amount) => amount > 0,
  "Số tiền phải lớn hơn 0",
);

/**
 * When it happened, as an ISO 8601 date-time with its offset, e.g. "2026-11-12T09:30:00+07:00".
 * The offset is required so the instant is unambiguous; the server stores it in UTC.
 */
export const occurredAtSchema = z.iso.datetime({
  offset: true,
  message: "Thời gian không hợp lệ (ISO 8601, ví dụ 2026-11-12T09:30:00+07:00)",
});

/** Optional free text; blank becomes null so "no note" has one representation. */
export const transactionNoteSchema = z
  .string()
  .trim()
  .max(500, "Ghi chú tối đa 500 ký tự")
  .transform((note) => (note === "" ? null : note))
  .nullable();

const incomeOrExpenseSchema = z.strictObject({
  type: z.enum(["INCOME", "EXPENSE"]),
  amount: transactionAmountSchema,
  walletId: referenceSchema("Chọn ví"),
  /** Must have the same type as the transaction. */
  categoryId: referenceSchema("Chọn danh mục"),
  occurredAt: occurredAtSchema,
  note: transactionNoteSchema.optional(),
});

const transferSchema = z
  .strictObject({
    type: z.literal("TRANSFER"),
    amount: transactionAmountSchema,
    /** Money leaves this wallet... */
    walletId: referenceSchema("Chọn ví chuyển"),
    /** ...and arrives in this one. Same currency as the source. */
    toWalletId: referenceSchema("Chọn ví nhận"),
    occurredAt: occurredAtSchema,
    note: transactionNoteSchema.optional(),
  })
  .refine((transfer) => transfer.walletId !== transfer.toWalletId, {
    path: ["toWalletId"],
    message: "Ví nhận phải khác ví chuyển",
  });

/**
 * Body of POST /transactions. Discriminated by `type`: income/expense need a category,
 * transfers need a destination wallet. The database has a CHECK constraint with the same
 * rule, so a bad row cannot exist even if this schema were bypassed.
 */
export const createTransactionRequestSchema = z.discriminatedUnion("type", [
  incomeOrExpenseSchema,
  transferSchema,
]);
export type CreateTransactionRequest = z.infer<typeof createTransactionRequestSchema>;
export type CreateTransactionInput = z.input<typeof createTransactionRequestSchema>;

/**
 * Body of PATCH /transactions/:id: any subset of the fields, including `type`. The server
 * merges it with the stored transaction and validates the result with the create schema,
 * so the same rules apply. When the type changes, the field of the old type is dropped
 * (a transfer that becomes an expense loses its destination wallet and needs a category).
 */
export const updateTransactionRequestSchema = z
  .strictObject({
    type: transactionTypeSchema,
    amount: transactionAmountSchema,
    walletId: idSchema,
    toWalletId: idSchema.nullable(),
    categoryId: idSchema.nullable(),
    occurredAt: occurredAtSchema,
    note: transactionNoteSchema,
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, "Không có thay đổi nào");
export type UpdateTransactionRequest = z.infer<typeof updateTransactionRequestSchema>;
export type UpdateTransactionInput = z.input<typeof updateTransactionRequestSchema>;

export const transactionSchema = z.object({
  id: z.string(),
  type: transactionTypeSchema,
  amount: moneySchema,
  walletId: z.string(),
  toWalletId: z.string().nullable(),
  categoryId: z.string().nullable(),
  note: z.string().nullable(),
  /** UTC instant; display it in the user's time zone. */
  occurredAt: z.iso.datetime(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type Transaction = z.infer<typeof transactionSchema>;

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  INCOME: "Khoản thu",
  EXPENSE: "Khoản chi",
  TRANSFER: "Chuyển ví",
};
