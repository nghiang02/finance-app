import { z } from "zod";

import { currencyCodeSchema, moneySchema } from "./common.js";

export const WALLET_TYPES = ["CASH", "BANK", "CREDIT_CARD", "E_WALLET", "OTHER"] as const;
export const walletTypeSchema = z.enum(WALLET_TYPES);
export type WalletType = z.infer<typeof walletTypeSchema>;

const walletNameSchema = z
  .string()
  .trim()
  .min(1, "Tên ví không được để trống")
  .max(50, "Tên ví tối đa 50 ký tự");

// strictObject: unknown fields are rejected (400) instead of silently ignored, so a client
// that tries to change something the API does not allow (e.g. currency) finds out.
export const createWalletRequestSchema = z.strictObject({
  name: walletNameSchema,
  type: walletTypeSchema,
  currency: currencyCodeSchema.default("VND"),
  /** May be negative, e.g. an existing credit card debt. */
  initialBalance: moneySchema.default(0),
});
export type CreateWalletRequest = z.infer<typeof createWalletRequestSchema>;
export type CreateWalletInput = z.input<typeof createWalletRequestSchema>;

/**
 * Currency cannot change after creation: every balance and report of the wallet
 * is expressed in it.
 */
export const updateWalletRequestSchema = z
  .strictObject({
    name: walletNameSchema,
    type: walletTypeSchema,
    initialBalance: moneySchema,
    archived: z.boolean(),
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, "Không có thay đổi nào");
export type UpdateWalletRequest = z.infer<typeof updateWalletRequestSchema>;
export type UpdateWalletInput = z.input<typeof updateWalletRequestSchema>;

export const walletSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: walletTypeSchema,
  currency: z.string(),
  initialBalance: moneySchema,
  /** initialBalance + income − expense − transfers out + transfers in (deleted transactions excluded). */
  balance: moneySchema,
  archived: z.boolean(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type Wallet = z.infer<typeof walletSchema>;

export const walletListSchema = z.array(walletSchema);

/** Vietnamese labels for the UI. */
export const WALLET_TYPE_LABELS: Record<WalletType, string> = {
  CASH: "Tiền mặt",
  BANK: "Tài khoản ngân hàng",
  CREDIT_CARD: "Thẻ tín dụng",
  E_WALLET: "Ví điện tử",
  OTHER: "Khác",
};

/** Accent color per wallet type, so web and mobile show the same wallet the same way. */
export const WALLET_TYPE_COLORS: Record<WalletType, string> = {
  CASH: "#2DB84C",
  BANK: "#2F80ED",
  CREDIT_CARD: "#8B5CF6",
  E_WALLET: "#F2994A",
  OTHER: "#64748B",
};
