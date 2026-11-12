import { formatMoney, type Wallet, WALLET_TYPE_LABELS } from "@finance/shared";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Icon, ICONS } from "@/components/Icon";
import { Empty } from "@/components/transactions/CategoryList";
import { WalletIcon } from "@/components/wallets/WalletIcon";
import { useAppTheme } from "@/lib/theme";

interface WalletListProps {
  wallets: readonly Wallet[];
  value: string | null;
  onSelect: (walletId: string) => void;
  hidden?: boolean;
}

/** Wallets with their balance, so the user sees where the money is before choosing. */
export function WalletList({ wallets, value, onSelect, hidden = false }: WalletListProps) {
  const theme = useAppTheme();
  if (wallets.length === 0) {
    return <Empty text="Không có ví nào để chọn." />;
  }
  return (
    <View>
      {wallets.map((wallet) => {
        const selected = wallet.id === value;
        return (
          <Pressable
            key={wallet.id}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            onPress={() => onSelect(wallet.id)}
            style={({ pressed }) => [
              styles.option,
              (pressed || selected) && {
                backgroundColor: selected ? theme.brandSoft : theme.field,
              },
            ]}
          >
            <WalletIcon type={wallet.type} size={40} />
            <View style={styles.text}>
              <Text style={[styles.name, { color: theme.ink }]} numberOfLines={1}>
                {wallet.name}
              </Text>
              <Text style={[styles.meta, { color: theme.muted }]}>
                {WALLET_TYPE_LABELS[wallet.type]} ·{" "}
                {hidden ? "•••••" : formatMoney(wallet.balance, wallet.currency)}
              </Text>
            </View>
            {selected ? <Icon name={ICONS.check} size={18} color={theme.brand} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  option: { flexDirection: "row", alignItems: "center", gap: 12, padding: 10, borderRadius: 16 },
  text: { flex: 1, gap: 2 },
  name: { fontSize: 16, fontWeight: "600" },
  meta: { fontSize: 13 },
});
