import {
  type ClientErrorCode,
  describeError,
  useHealth,
  useSession,
  useSignOut,
} from "@finance/api-client";
import { formatMoney } from "@finance/shared";
import { useTheme } from "expo-router";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";

import { PrimaryButton } from "@/components/PrimaryButton";
import { apiBaseUrl } from "@/lib/api";

const HEALTH_MESSAGES: Partial<Record<ClientErrorCode, string>> = {
  NETWORK_ERROR: "Không truy cập được máy chủ. Điện thoại và máy tính có cùng Wi-Fi không?",
  SERVICE_UNAVAILABLE: "Máy chủ chạy nhưng chưa kết nối được cơ sở dữ liệu.",
};

function ApiStatus() {
  const { data, error, isPending, isFetching, refetch } = useHealth();

  if (isPending) {
    return <ActivityIndicator />;
  }
  if (error) {
    return (
      <View style={styles.row}>
        <Text style={[styles.body, styles.error]}>{describeError(error, HEALTH_MESSAGES)}</Text>
        <PrimaryButton
          title="Thử lại"
          variant="outline"
          onPress={() => void refetch()}
          loading={isFetching}
        />
      </View>
    );
  }
  return <Text style={[styles.body, styles.ok]}>API hoạt động ({data.status}).</Text>;
}

export default function HomeScreen() {
  const { colors } = useTheme();
  const { user } = useSession();
  const signOut = useSignOut();
  const card = [styles.card, { backgroundColor: colors.card, borderColor: colors.border }];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.greeting}>
        <Text style={[styles.title, { color: colors.text }]}>
          Xin chào{user?.name ? `, ${user.name}` : ""}!
        </Text>
        <Text style={styles.caption}>{user?.email}</Text>
      </View>

      <View style={card}>
        <Text style={[styles.heading, { color: colors.text }]}>Kết nối API</Text>
        <ApiStatus />
        <Text style={styles.caption}>{apiBaseUrl}</Text>
      </View>

      <View style={card}>
        <Text style={[styles.heading, { color: colors.text }]}>
          Định dạng tiền từ @finance/shared
        </Text>
        <Text style={[styles.amount, { color: colors.text }]}>{formatMoney(1_500_000)}</Text>
      </View>

      {/* On success the session ends and the root layout switches to the sign-in screen. */}
      <PrimaryButton
        title="Đăng xuất"
        variant="outline"
        onPress={() => signOut.mutate()}
        loading={signOut.isPending}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { gap: 16, padding: 20 },
  greeting: { gap: 4 },
  title: { fontSize: 24, fontWeight: "700" },
  card: { gap: 8, padding: 16, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth },
  heading: { fontSize: 16, fontWeight: "600" },
  body: { fontSize: 15 },
  ok: { color: "#059669" },
  error: { color: "#dc2626" },
  caption: { fontSize: 12, color: "#71717a" },
  amount: { fontSize: 24, fontWeight: "600", fontVariant: ["tabular-nums"] },
  row: { gap: 8, alignItems: "flex-start" },
});
