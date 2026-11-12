import { WALLET_TYPE_COLORS, type WalletType } from "@finance/shared";
import { StyleSheet, View } from "react-native";

import { Icon, ICONS, type IconName } from "@/components/Icon";
import { tint } from "@/lib/theme";

export const WALLET_TYPE_ICONS: Record<WalletType, IconName> = {
  CASH: ICONS.cash,
  BANK: ICONS.bank,
  CREDIT_CARD: ICONS.card,
  E_WALLET: ICONS.phone,
  OTHER: ICONS.other,
};

export function WalletIcon({ type, size = 44 }: { type: WalletType; size?: number }) {
  const color = WALLET_TYPE_COLORS[type];
  return (
    <View
      style={[
        styles.tile,
        { width: size, height: size, borderRadius: size * 0.32, backgroundColor: tint(color) },
      ]}
    >
      <Icon name={WALLET_TYPE_ICONS[type]} size={size * 0.5} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { alignItems: "center", justifyContent: "center" },
});
