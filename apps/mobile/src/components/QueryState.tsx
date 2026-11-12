import { type ApiError, describeError } from "@finance/api-client";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { Icon, ICONS, type IconName } from "@/components/Icon";
import { PrimaryButton } from "@/components/PrimaryButton";
import { useAppTheme } from "@/lib/theme";

interface QueryStateProps {
  error: ApiError | null;
  onRetry: () => void;
  retrying: boolean;
}

/** Loading spinner, or the error with a retry button. */
export function QueryState({ error, onRetry, retrying }: QueryStateProps) {
  const theme = useAppTheme();
  if (!error) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.brand} />
      </View>
    );
  }
  return (
    <View style={styles.center}>
      <View style={[styles.badge, { backgroundColor: `${theme.expense}1A` }]}>
        <Icon name={ICONS.offline} size={26} color={theme.expense} />
      </View>
      <Text style={[styles.message, { color: theme.muted }]}>{describeError(error)}</Text>
      <PrimaryButton title="Thử lại" variant="soft" onPress={onRetry} loading={retrying} />
    </View>
  );
}

interface EmptyStateProps {
  icon?: IconName;
  title?: string;
  message: string;
}

export function EmptyState({ icon = ICONS.piggy, title, message }: EmptyStateProps) {
  const theme = useAppTheme();
  return (
    <View style={styles.center}>
      <View style={[styles.badge, { backgroundColor: theme.brandSoft }]}>
        <Icon name={icon} size={26} color={theme.brand} />
      </View>
      {title ? <Text style={[styles.title, { color: theme.ink }]}>{title}</Text> : null}
      <Text style={[styles.message, { color: theme.muted }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, gap: 12, padding: 32, alignItems: "center", justifyContent: "center" },
  badge: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 17, fontWeight: "700" },
  message: { fontSize: 15, textAlign: "center", lineHeight: 21 },
});
