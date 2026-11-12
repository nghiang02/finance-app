import { type Category, formatMoney, type Transaction, type Wallet } from "@finance/shared";
import { StyleSheet, Text, View } from "react-native";

import { CategoryAvatar } from "@/components/categories/CategoryAvatar";
import { Icon, ICONS } from "@/components/Icon";
import { ListRow } from "@/components/ListRow";
import { tint, useAppTheme } from "@/lib/theme";

interface TransactionRowProps {
  transaction: Transaction;
  categoriesById: ReadonlyMap<string, Category>;
  walletsById: ReadonlyMap<string, Wallet>;
  hidden?: boolean;
  separated?: boolean;
  onPress?: () => void;
}

/** Category (or transfer) icon, name, note/wallet, and the signed amount in its color. */
export function TransactionRow({
  transaction,
  categoriesById,
  walletsById,
  hidden = false,
  separated = false,
  onPress,
}: TransactionRowProps) {
  const theme = useAppTheme();
  const wallet = walletsById.get(transaction.walletId);
  const walletName = wallet?.name ?? "Ví đã xóa";
  const currency = wallet?.currency ?? "VND";

  let title: string;
  let leading;
  if (transaction.type === "TRANSFER") {
    const destination = transaction.toWalletId
      ? walletsById.get(transaction.toWalletId)
      : undefined;
    title = `${walletName} → ${destination?.name ?? "Ví đã xóa"}`;
    leading = (
      <View style={[styles.transfer, { backgroundColor: tint(theme.muted, 0.15) }]}>
        <Icon name={ICONS.transfer} size={20} color={theme.muted} />
      </View>
    );
  } else {
    const category = transaction.categoryId
      ? categoriesById.get(transaction.categoryId)
      : undefined;
    title = category?.name ?? "Không rõ danh mục";
    leading = <CategoryAvatar icon={category?.icon ?? null} color={category?.color ?? null} />;
  }

  const sign = transaction.type === "INCOME" ? "+" : transaction.type === "EXPENSE" ? "−" : "";
  const color =
    transaction.type === "INCOME"
      ? theme.income
      : transaction.type === "EXPENSE"
        ? theme.expense
        : theme.ink;

  return (
    <ListRow
      separated={separated}
      leading={leading}
      title={title}
      subtitle={transaction.note ?? (transaction.type === "TRANSFER" ? "Chuyển ví" : walletName)}
      chevron={false}
      onPress={onPress}
      accessibilityLabel={`${title}, ${formatMoney(transaction.amount, currency)}`}
      trailing={
        <Text style={[styles.amount, { color }]}>
          {hidden ? "••••" : `${sign}${formatMoney(transaction.amount, currency)}`}
        </Text>
      }
    />
  );
}

const styles = StyleSheet.create({
  transfer: {
    width: 44,
    height: 44,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  amount: { fontSize: 15, fontWeight: "700", fontVariant: ["tabular-nums"] },
});
