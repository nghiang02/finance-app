import { type ClientErrorCode, useHealth, useSession, useSignOut } from "@finance/api-client";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { Card } from "@/components/Card";
import { Icon, ICONS } from "@/components/Icon";
import { ListRow } from "@/components/ListRow";
import { PrimaryButton } from "@/components/PrimaryButton";
import { ScreenHeader } from "@/components/ScreenHeader";
import { apiBaseUrl } from "@/lib/api";
import { useAppTheme } from "@/lib/theme";

const HEALTH_MESSAGES: Partial<Record<ClientErrorCode, string>> = {
  NETWORK_ERROR: "Không truy cập được máy chủ. Điện thoại và máy tính có cùng Wi-Fi không?",
  SERVICE_UNAVAILABLE: "Máy chủ chạy nhưng chưa kết nối được cơ sở dữ liệu.",
};

export default function AccountScreen() {
  const theme = useAppTheme();
  const { user } = useSession();
  const signOut = useSignOut();
  const health = useHealth();
  const initial = (user?.name ?? user?.email ?? "?").charAt(0).toUpperCase();

  const serverStatus = health.isPending
    ? "Đang kiểm tra…"
    : health.error
      ? (HEALTH_MESSAGES[health.error.code] ?? `Lỗi máy chủ (${health.error.code})`)
      : "Hoạt động";

  return (
    <ScrollView style={{ backgroundColor: theme.canvas }} contentContainerStyle={styles.content}>
      <ScreenHeader title="Tài khoản" />
      <View style={styles.body}>
        <Card style={styles.profile}>
          <View style={[styles.avatar, { backgroundColor: theme.brand }]}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <View style={styles.profileText}>
            {user?.name ? (
              <Text style={[styles.name, { color: theme.ink }]}>{user.name}</Text>
            ) : null}
            <Text style={[styles.email, { color: theme.muted }]}>{user?.email}</Text>
          </View>
        </Card>

        <Card padded={false}>
          <ListRow title="Tiền tệ" trailing={<Value text={user?.currency ?? "VND"} />} />
          <ListRow
            separated
            title="Múi giờ"
            trailing={<Value text={user?.timezone ?? "Asia/Ho_Chi_Minh"} />}
          />
        </Card>

        <Card padded={false}>
          <ListRow
            leading={
              <Icon
                name={health.error ? ICONS.offline : ICONS.server}
                size={20}
                color={health.error ? theme.expense : theme.brand}
              />
            }
            title="Máy chủ"
            subtitle={apiBaseUrl}
            trailing={
              <Value text={serverStatus} color={health.error ? theme.expense : theme.brand} />
            }
            onPress={() => void health.refetch()}
            chevron={false}
          />
        </Card>

        {/* On success the session ends and the (app) layout redirects to the sign-in screen. */}
        <PrimaryButton
          title="Đăng xuất"
          variant="danger"
          icon={ICONS.logout}
          onPress={() => signOut.mutate()}
          loading={signOut.isPending}
        />
      </View>
    </ScrollView>
  );
}

function Value({ text, color }: { text: string; color?: string }) {
  const theme = useAppTheme();
  return (
    <Text style={[styles.value, { color: color ?? theme.muted }]} numberOfLines={2}>
      {text}
    </Text>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 32 },
  body: { gap: 16, paddingHorizontal: 16 },
  profile: { flexDirection: "row", alignItems: "center", gap: 14 },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#FFFFFF", fontSize: 24, fontWeight: "800" },
  profileText: { flex: 1, gap: 2 },
  name: { fontSize: 18, fontWeight: "700" },
  email: { fontSize: 14 },
  value: { fontSize: 14, fontWeight: "600", maxWidth: 180, textAlign: "right" },
});
