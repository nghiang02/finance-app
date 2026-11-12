import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAppTheme } from "@/lib/theme";

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  /** Right side, e.g. a round "+" button. */
  action?: ReactNode;
}

/** Large title header for tab screens (they hide the navigation header). */
export function ScreenHeader({ title, subtitle, action }: ScreenHeaderProps) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
      <View style={styles.text}>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: theme.muted }]}>{subtitle}</Text>
        ) : null}
        <Text style={[styles.title, { color: theme.ink }]}>{title}</Text>
      </View>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  text: { flex: 1, gap: 2 },
  subtitle: { fontSize: 14 },
  title: { fontSize: 30, fontWeight: "800", letterSpacing: -0.5 },
});
