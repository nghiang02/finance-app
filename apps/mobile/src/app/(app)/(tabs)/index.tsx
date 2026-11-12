import { useCategories, useSession, useTransactions, useWallets } from "@finance/api-client";
import {
  buildCategoryTree,
  currentMonth,
  DEFAULT_TIME_ZONE,
  WALLET_TYPE_LABELS,
} from "@finance/shared";
import { router } from "expo-router";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

import { Card } from "@/components/Card";
import { CategoryAvatar } from "@/components/categories/CategoryAvatar";
import { Icon, ICONS, type IconName } from "@/components/Icon";
import { ListRow } from "@/components/ListRow";
import { Money } from "@/components/Money";
import { QueryState } from "@/components/QueryState";
import { ScreenHeader } from "@/components/ScreenHeader";
import { TransactionRow } from "@/components/transactions/TransactionRow";
import { BalanceCard } from "@/components/wallets/BalanceCard";
import { WalletIcon } from "@/components/wallets/WalletIcon";
import { useBalanceVisibility } from "@/lib/balance-visibility";
import { useLookups } from "@/lib/lookups";
import { useAppTheme } from "@/lib/theme";

export default function HomeScreen() {
  const theme = useAppTheme();
  const { user } = useSession();
  const wallets = useWallets();
  const categories = useCategories();
  const { hidden } = useBalanceVisibility();
  const lookups = useLookups();
  const timeZone = user?.timezone ?? DEFAULT_TIME_ZONE;
  const recent = useTransactions({ month: currentMonth(timeZone) });
  const recentItems = recent.data?.pages[0]?.items.slice(0, 5) ?? [];

  const name = user?.name ?? user?.email.split("@")[0] ?? "";
  const today = new Intl.DateTimeFormat("vi-VN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone,
  }).format(new Date());
  const activeWallets = (wallets.data ?? []).filter((wallet) => !wallet.archived);
  const expenseRoots = buildCategoryTree(
    (categories.data ?? []).filter((category) => category.type === "EXPENSE"),
  );

  return (
    <ScrollView
      style={{ backgroundColor: theme.canvas }}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={wallets.isRefetching}
          onRefresh={() => {
            void wallets.refetch();
            void categories.refetch();
            void recent.refetch();
          }}
        />
      }
    >
      <ScreenHeader
        subtitle={today.charAt(0).toUpperCase() + today.slice(1)}
        title={`Xin chào, ${name} 👋`}
      />

      <View style={styles.body}>
        {wallets.data ? (
          <BalanceCard wallets={wallets.data} />
        ) : (
          <Card style={styles.placeholder}>
            <QueryState
              error={wallets.error}
              onRetry={() => void wallets.refetch()}
              retrying={wallets.isFetching}
            />
          </Card>
        )}

        <View style={styles.actions}>
          <QuickAction
            icon={ICONS.wallet}
            label="Thêm ví"
            onPress={() => router.push("/wallets/new")}
          />
          <QuickAction
            icon={ICONS.categories}
            label="Thêm danh mục"
            onPress={() =>
              router.push({ pathname: "/categories/new", params: { type: "EXPENSE" } })
            }
          />
        </View>

        <Card
          title="Ví của tôi"
          padded={false}
          action={<TextLink label="Xem tất cả" onPress={() => router.navigate("/wallets")} />}
        >
          {activeWallets.length === 0 ? (
            <Text style={[styles.empty, { color: theme.muted }]}>
              {wallets.data ? "Chưa có ví nào. Bấm “Thêm ví” để bắt đầu." : "Đang tải…"}
            </Text>
          ) : (
            <View style={styles.list}>
              {activeWallets.slice(0, 4).map((wallet, index) => (
                <ListRow
                  key={wallet.id}
                  separated={index > 0}
                  leading={<WalletIcon type={wallet.type} size={40} />}
                  title={wallet.name}
                  subtitle={WALLET_TYPE_LABELS[wallet.type]}
                  trailing={
                    <Money
                      amount={wallet.balance}
                      currency={wallet.currency}
                      hidden={hidden}
                      style={styles.amount}
                    />
                  }
                  chevron={false}
                  onPress={() =>
                    router.push({ pathname: "/wallets/[id]", params: { id: wallet.id } })
                  }
                />
              ))}
            </View>
          )}
        </Card>

        <Card
          title="Giao dịch gần đây"
          padded={false}
          action={<TextLink label="Xem tất cả" onPress={() => router.navigate("/transactions")} />}
        >
          {recentItems.length === 0 ? (
            <Text style={[styles.empty, { color: theme.muted }]}>
              {recent.data
                ? "Tháng này chưa có giao dịch. Bấm + để ghi khoản đầu tiên."
                : "Đang tải…"}
            </Text>
          ) : (
            <View style={styles.list}>
              {recentItems.map((transaction, index) => (
                <TransactionRow
                  key={transaction.id}
                  transaction={transaction}
                  {...lookups}
                  hidden={hidden}
                  separated={index > 0}
                  onPress={() =>
                    router.push({ pathname: "/transactions/[id]", params: { id: transaction.id } })
                  }
                />
              ))}
            </View>
          )}
        </Card>

        <Card
          title="Danh mục chi tiêu"
          action={<TextLink label="Quản lý" onPress={() => router.push("/categories")} />}
        >
          <View style={styles.grid}>
            {expenseRoots.slice(0, 8).map((category) => (
              <View key={category.id} style={styles.gridItem}>
                <CategoryAvatar icon={category.icon} color={category.color} size={48} />
                <Text style={[styles.gridLabel, { color: theme.ink }]} numberOfLines={2}>
                  {category.name}
                </Text>
              </View>
            ))}
          </View>
        </Card>
      </View>
    </ScrollView>
  );
}

function QuickAction({
  icon,
  label,
  onPress,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
}) {
  const theme = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        { backgroundColor: theme.surface },
        pressed && { opacity: 0.7 },
      ]}
    >
      <View style={[styles.actionIcon, { backgroundColor: theme.brandSoft }]}>
        <Icon name={icon} size={20} color={theme.brand} />
        <View
          style={[styles.actionPlus, { backgroundColor: theme.brand, borderColor: theme.surface }]}
        >
          <Icon name={ICONS.plus} size={9} color="#FFFFFF" />
        </View>
      </View>
      <Text style={[styles.actionLabel, { color: theme.ink }]}>{label}</Text>
    </Pressable>
  );
}

function TextLink({ label, onPress }: { label: string; onPress: () => void }) {
  const theme = useAppTheme();
  return (
    <Pressable accessibilityRole="link" onPress={onPress} hitSlop={8}>
      <Text style={[styles.link, { color: theme.brand }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 32 },
  body: { gap: 16, paddingHorizontal: 16 },
  placeholder: { height: 150 },
  actions: { flexDirection: "row", gap: 12 },
  action: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 20,
    padding: 14,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  actionPlus: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 16,
    height: 16,
    borderRadius: 999,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  actionLabel: { flex: 1, fontSize: 14, fontWeight: "600" },
  list: { paddingBottom: 6 },
  amount: { fontSize: 15, fontWeight: "700" },
  empty: { fontSize: 14, paddingHorizontal: 18, paddingBottom: 18 },
  link: { fontSize: 14, fontWeight: "700" },
  grid: { flexDirection: "row", flexWrap: "wrap", rowGap: 16 },
  gridItem: { width: "25%", alignItems: "center", gap: 6, paddingHorizontal: 2 },
  gridLabel: { fontSize: 12, fontWeight: "500", textAlign: "center" },
});
