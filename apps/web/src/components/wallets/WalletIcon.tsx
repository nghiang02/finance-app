import { WALLET_TYPE_COLORS, type WalletType } from "@finance/shared";
import {
  Banknote,
  CreditCard,
  Landmark,
  type LucideIcon,
  Smartphone,
  Wallet as WalletGlyph,
} from "lucide-react";

import { cx, tint } from "@/lib/cx";

export const WALLET_TYPE_ICONS: Record<WalletType, LucideIcon> = {
  CASH: Banknote,
  BANK: Landmark,
  CREDIT_CARD: CreditCard,
  E_WALLET: Smartphone,
  OTHER: WalletGlyph,
};

export function WalletIcon({ type, size = "md" }: { type: WalletType; size?: "sm" | "md" }) {
  const Icon = WALLET_TYPE_ICONS[type];
  const color = WALLET_TYPE_COLORS[type];
  return (
    <span
      aria-hidden
      className={cx(
        "flex shrink-0 items-center justify-center rounded-2xl",
        size === "sm" ? "size-10" : "size-12",
      )}
      style={{ backgroundColor: tint(color), color }}
    >
      <Icon className={size === "sm" ? "size-5" : "size-6"} strokeWidth={2} />
    </span>
  );
}
