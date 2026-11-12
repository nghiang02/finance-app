import { totalBalanceByCurrency, type Wallet } from "@finance/shared";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Icon, ICONS } from "@/components/Icon";
import { Money } from "@/components/Money";
import { useBalanceVisibility } from "@/lib/balance-visibility";
import { BRAND } from "@/lib/theme";

/** Green hero card: total of active wallets, with an eye toggle that hides every amount. */
export function BalanceCard({ wallets }: { wallets: Wallet[] }) {
  const { hidden, toggle } = useBalanceVisibility();
  const totals = totalBalanceByCurrency(wallets);
  const shown = totals.length > 0 ? totals : [{ currency: "VND", total: 0 }];
  const activeCount = wallets.filter((wallet) => !wallet.archived).length;

  return (
    <View style={styles.card}>
      <View style={[styles.circle, styles.circleTop]} />
      <View style={[styles.circle, styles.circleBottom]} />

      <View style={styles.labelRow}>
        <Text style={styles.label}>Tổng số dư</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={hidden ? "Hiện số dư" : "Ẩn số dư"}
          onPress={toggle}
          hitSlop={10}
        >
          <Icon name={hidden ? ICONS.eyeOff : ICONS.eye} size={18} color="rgba(255,255,255,0.85)" />
        </Pressable>
      </View>
      {shown.map(({ currency, total }) => (
        <Money
          key={currency}
          amount={total}
          currency={currency}
          hidden={hidden}
          signed={false}
          style={styles.total}
        />
      ))}
      <Text style={styles.caption}>{activeCount} ví đang dùng</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: BRAND[600],
    borderRadius: 28,
    padding: 22,
    gap: 4,
    overflow: "hidden",
    shadowColor: BRAND[700],
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  circle: { position: "absolute", borderRadius: 999, backgroundColor: "rgba(255,255,255,0.1)" },
  circleTop: { width: 180, height: 180, top: -70, right: -40 },
  circleBottom: { width: 220, height: 220, bottom: -120, right: -90, opacity: 0.6 },
  labelRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  label: { color: "rgba(255,255,255,0.85)", fontSize: 14, fontWeight: "600" },
  total: { color: "#FFFFFF", fontSize: 32, fontWeight: "800", letterSpacing: -0.5 },
  caption: { color: "rgba(255,255,255,0.8)", fontSize: 13, marginTop: 6 },
});
