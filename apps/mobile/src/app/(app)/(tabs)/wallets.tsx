import { useWallets } from "@finance/api-client";
import { type Wallet, WALLET_TYPE_LABELS } from "@finance/shared";
import { router } from "expo-router";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

import { Card } from "@/components/Card";
import { ICONS } from "@/components/Icon";
import { ListRow } from "@/components/ListRow";
import { Money } from "@/components/Money";
import { EmptyState, QueryState } from "@/components/QueryState";
import { RoundButton } from "@/components/RoundButton";
import { ScreenHeader } from "@/components/ScreenHeader";
import { BalanceCard } from "@/components/wallets/BalanceCard";
import { WalletIcon } from "@/components/wallets/WalletIcon";
import { useBalanceVisibility } from "@/lib/balance-visibility";
import { useAppTheme } from "@/lib/theme";

export default function WalletsScreen() {
  const theme = useAppTheme();
  const wallets = useWallets();

  const header = (
    <ScreenHeader
      title="Ví của tôi"
      action={
        <RoundButton
          icon={ICONS.plus}
          label="Thêm ví"
          onPress={() => router.push("/wallets/new")}
        />
      }
    />
  );

  if (!wallets.data || wallets.data.length === 0) {
    return (
      <View style={[styles.flex, { backgroundColor: theme.canvas }]}>
        {header}
        {wallets.data ? (
          <EmptyState
            icon={ICONS.wallet}
            title="Chưa có ví nào"
            message="Tạo ví đầu tiên, ví dụ “Tiền mặt” hoặc tài khoản ngân hàng, để theo dõi số dư."
          />
        ) : (
          <QueryState
            error={wallets.error}
            onRetry={() => void wallets.refetch()}
            retrying={wallets.isFetching}
          />
        )}
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: theme.canvas }}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={wallets.isRefetching}
          onRefresh={() => void wallets.refetch()}
        />
      }
    >
      {header}
      <View style={styles.body}>
        <BalanceCard wallets={wallets.data} />
        <WalletSection title="Đang dùng" wallets={wallets.data.filter((w) => !w.archived)} />
        <WalletSection title="Đã lưu trữ" wallets={wallets.data.filter((w) => w.archived)} />
      </View>
    </ScrollView>
  );
}

function WalletSection({ title, wallets }: { title: string; wallets: Wallet[] }) {
  const theme = useAppTheme();
  const { hidden } = useBalanceVisibility();
  if (wallets.length === 0) {
    return null;
  }
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.muted }]}>
        {title} · {wallets.length}
      </Text>
      <Card padded={false}>
        {wallets.map((wallet, index) => (
          <ListRow
            key={wallet.id}
            separated={index > 0}
            leading={<WalletIcon type={wallet.type} />}
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
            accessibilityLabel={`Sửa ví ${wallet.name}`}
            onPress={() => router.push({ pathname: "/wallets/[id]", params: { id: wallet.id } })}
          />
        ))}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingBottom: 32 },
  body: { gap: 20, paddingHorizontal: 16 },
  section: { gap: 8 },
  sectionTitle: { fontSize: 13, fontWeight: "700", marginLeft: 4 },
  amount: { fontSize: 15, fontWeight: "700" },
});
