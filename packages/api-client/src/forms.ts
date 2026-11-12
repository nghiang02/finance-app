import {
  type Category,
  type CategoryType,
  createCategoryRequestSchema,
  type CreateCategoryRequest,
  createTransactionRequestSchema,
  type CreateTransactionRequest,
  createWalletRequestSchema,
  type CreateWalletRequest,
  formatMoneyInput,
  parseMoneyInput,
  type Transaction,
  type TransactionType,
  updateCategoryRequestSchema,
  type UpdateCategoryRequest,
  type UpdateTransactionRequest,
  updateWalletRequestSchema,
  type UpdateWalletRequest,
  type Wallet,
  type WalletType,
} from "@finance/shared";

import { type FieldErrors, toFieldErrors } from "./errors.js";

/**
 * Form state → request body, shared by web and mobile so both apps parse amounts and
 * apply the same rules. Screens only keep the UI. Every function returns either the request
 * (already validated by the schema the server uses) or errors keyed by field name.
 */
export type FormResult<T> = { success: true; data: T } | { success: false; errors: FieldErrors };

type SchemaResult<T> =
  | { success: true; data: T }
  | { success: false; error: { issues: Parameters<typeof toFieldErrors>[0] } };

function fromSchema<T>(result: SchemaResult<T>): FormResult<T> {
  return result.success
    ? { success: true, data: result.data }
    : { success: false, errors: toFieldErrors(result.error.issues) };
}

// --- Wallets -------------------------------------------------------------------------------

export interface WalletFormValues {
  name: string;
  type: WalletType;
  /** As typed: "1.500.000", "1500000" or "" (= 0). Always without a sign. */
  amount: string;
  /** Makes the initial balance negative, e.g. credit card debt. */
  isDebt: boolean;
  archived: boolean;
}

export function walletFormValues(wallet?: Wallet): WalletFormValues {
  return {
    name: wallet?.name ?? "",
    type: wallet?.type ?? "CASH",
    amount: wallet ? formatMoneyInput(wallet.initialBalance) : "",
    isDebt: (wallet?.initialBalance ?? 0) < 0,
    archived: wallet?.archived ?? false,
  };
}

const INVALID_AMOUNT: FieldErrors = {
  initialBalance: "Số tiền không hợp lệ, ví dụ 1.500.000",
};

/** Signed amount in đồng, or null when the text is not a valid amount. */
function initialBalanceOf(values: WalletFormValues): number | null {
  const amount = parseMoneyInput(values.amount.trim() === "" ? "0" : values.amount);
  if (amount === null) {
    return null;
  }
  // `amount !== 0` avoids sending -0.
  return values.isDebt && amount !== 0 ? -amount : amount;
}

export function toCreateWalletRequest(values: WalletFormValues): FormResult<CreateWalletRequest> {
  const initialBalance = initialBalanceOf(values);
  if (initialBalance === null) {
    return { success: false, errors: INVALID_AMOUNT };
  }
  return fromSchema(
    createWalletRequestSchema.safeParse({ name: values.name, type: values.type, initialBalance }),
  );
}

export function toUpdateWalletRequest(values: WalletFormValues): FormResult<UpdateWalletRequest> {
  const initialBalance = initialBalanceOf(values);
  if (initialBalance === null) {
    return { success: false, errors: INVALID_AMOUNT };
  }
  return fromSchema(
    updateWalletRequestSchema.safeParse({
      name: values.name,
      type: values.type,
      initialBalance,
      archived: values.archived,
    }),
  );
}

// --- Categories ----------------------------------------------------------------------------

export type CategoryFormTarget =
  | { mode: "create"; type: CategoryType; parentId: string | null }
  | { mode: "edit"; category: Category };

export interface CategoryFormValues {
  name: string;
  /** Fixed after creation. */
  type: CategoryType;
  /** Emoji as typed; "" = no icon. */
  icon: string;
  /** undefined = not chosen yet: a new child then inherits its parent's color. */
  color: string | null | undefined;
  parentId: string | null;
}

export function categoryFormValues(target: CategoryFormTarget): CategoryFormValues {
  if (target.mode === "edit") {
    const { category } = target;
    return {
      name: category.name,
      type: category.type,
      icon: category.icon ?? "",
      color: category.color,
      parentId: category.parentId,
    };
  }
  return { name: "", type: target.type, icon: "", color: undefined, parentId: target.parentId };
}

export function toCreateCategoryRequest(
  values: CategoryFormValues,
): FormResult<CreateCategoryRequest> {
  return fromSchema(
    createCategoryRequestSchema.safeParse({
      name: values.name,
      type: values.type,
      icon: values.icon.trim() === "" ? null : values.icon,
      parentId: values.parentId,
      ...(values.color !== undefined && { color: values.color }),
    }),
  );
}

export function toUpdateCategoryRequest(
  values: CategoryFormValues,
): FormResult<UpdateCategoryRequest> {
  return fromSchema(
    updateCategoryRequestSchema.safeParse({
      name: values.name,
      icon: values.icon.trim() === "" ? null : values.icon,
      color: values.color ?? null,
      parentId: values.parentId,
    }),
  );
}

// --- Transactions --------------------------------------------------------------------------

export type TransactionFormTarget =
  | { mode: "create"; type?: TransactionType; walletId: string | null }
  | { mode: "edit"; transaction: Transaction };

export interface TransactionFormValues {
  type: TransactionType;
  /** As shown in the field: "1.500.000" (see normalizeAmountInput). */
  amount: string;
  walletId: string | null;
  /** Transfers only. */
  toWalletId: string | null;
  /** Income and expense only. */
  categoryId: string | null;
  note: string;
  /** ISO instant. */
  occurredAt: string;
}

export function transactionFormValues(
  target: TransactionFormTarget,
  now: Date = new Date(),
): TransactionFormValues {
  if (target.mode === "edit") {
    const { transaction } = target;
    return {
      type: transaction.type,
      amount: formatMoneyInput(transaction.amount),
      walletId: transaction.walletId,
      toWalletId: transaction.toWalletId,
      categoryId: transaction.categoryId,
      note: transaction.note ?? "",
      occurredAt: transaction.occurredAt,
    };
  }
  return {
    type: target.type ?? "EXPENSE",
    amount: "",
    walletId: target.walletId,
    toWalletId: null,
    categoryId: null,
    note: "",
    occurredAt: now.toISOString(),
  };
}

/** Same rules as the server (create schema), plus a clear message for the amount field. */
function validateTransaction(values: TransactionFormValues): FormResult<CreateTransactionRequest> {
  const amount = parseMoneyInput(values.amount);
  const common = {
    type: values.type,
    // 0 lets the schema check every other field; the amount message is set below.
    amount: amount ?? 0,
    walletId: values.walletId,
    occurredAt: values.occurredAt,
    note: values.note,
  };
  const result = createTransactionRequestSchema.safeParse(
    values.type === "TRANSFER"
      ? { ...common, toWalletId: values.toWalletId }
      : { ...common, categoryId: values.categoryId },
  );
  if (result.success && amount !== null) {
    return { success: true, data: result.data };
  }
  const errors: FieldErrors = result.success ? {} : toFieldErrors(result.error.issues);
  if (amount === null) {
    errors.amount = values.amount.trim() === "" ? "Nhập số tiền" : "Số tiền không hợp lệ";
  }
  return { success: false, errors };
}

export function toCreateTransactionRequest(
  values: TransactionFormValues,
): FormResult<CreateTransactionRequest> {
  return validateTransaction(values);
}

/**
 * Sends every field: a full replacement is simpler than computing a diff and the server
 * re-validates the merged result anyway. The field of the other type is sent as null.
 */
export function toUpdateTransactionRequest(
  values: TransactionFormValues,
): FormResult<UpdateTransactionRequest> {
  const result = validateTransaction(values);
  if (!result.success) {
    return result;
  }
  const data = result.data;
  return {
    success: true,
    data: {
      type: data.type,
      amount: data.amount,
      walletId: data.walletId,
      occurredAt: data.occurredAt,
      note: data.note ?? null,
      ...(data.type === "TRANSFER"
        ? { toWalletId: data.toWalletId, categoryId: null }
        : { categoryId: data.categoryId, toWalletId: null }),
    },
  };
}
