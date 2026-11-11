import { type ClientErrorCode, useHealth } from "@finance/api-client";
import { formatMoney } from "@finance/shared";
import { useTheme } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { apiBaseUrl } from "@/lib/api";

const ERROR_MESSAGES: Partial<Record<ClientErrorCode, string>> = {
  NETWORK_ERROR: "Không truy cập được máy chủ. Điện thoại và máy tính có cùng Wi-Fi không?",
  SERVICE_UNAVAILABLE: "Máy chủ chạy nhưng chưa kết nối được cơ sở dữ liệu.",
};

function ApiStatus() {
  const { colors } = useTheme();
  const { data, error, isPending, isFetching, refetch } = useHealth();

  if (isPending) {
    return <ActivityIndicator />;
  }

  if (error) {
    return (
      <View style={styles.row}>
        <Text style={[styles.body, styles.error]}>
          {ERROR_MESSAGES[error.code] ?? `Lỗi không xác định (${error.code}).`}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => void refetch()}
          disabled={isFetching}
          style={[styles.button, { borderColor: colors.border }]}
        >
          <Text style={{ color: colors.text }}>{isFetching ? "Đang thử lại…" : "Thử lại"}</Text>
        </Pressable>
      </View>
    );
  }

  return <Text style={[styles.body, styles.ok]}>API hoạt động ({data.status}).</Text>;
}

export default function HomeScreen() {
  const { colors } = useTheme();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.heading, { color: colors.text }]}>Kết nối API</Text>
        <ApiStatus />
        <Text style={styles.caption}>{apiBaseUrl}</Text>
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.heading, { color: colors.text }]}>
          Định dạng tiền từ @finance/shared
        </Text>
        <Text style={[styles.amount, { color: colors.text }]}>{formatMoney(1_500_000)}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { gap: 16, padding: 20 },
  card: { gap: 8, padding: 16, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth },
  heading: { fontSize: 16, fontWeight: "600" },
  body: { fontSize: 15 },
  ok: { color: "#059669" },
  error: { color: "#dc2626", flexShrink: 1 },
  caption: { fontSize: 12, color: "#71717a" },
  amount: { fontSize: 24, fontWeight: "600", fontVariant: ["tabular-nums"] },
  row: { gap: 8, alignItems: "flex-start" },
  button: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
});
