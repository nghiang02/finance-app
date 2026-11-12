import {
  type Category,
  type CategoryType,
  createCategoryRequestSchema,
  type CreateCategoryRequest,
  createWalletRequestSchema,
  type CreateWalletRequest,
  formatMoneyInput,
  parseMoneyInput,
  updateCategoryRequestSchema,
  type UpdateCategoryRequest,
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
