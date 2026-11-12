import type { ReactNode } from "react";
import { StyleSheet, Text, View, type ViewStyle } from "react-native";

import { useAppTheme } from "@/lib/theme";

interface CardProps {
  title?: string;
  /** Right side of the header, e.g. a "Xem tất cả" link. */
  action?: ReactNode;
  padded?: boolean;
  style?: ViewStyle;
  children: ReactNode;
}

export function Card({ title, action, padded = true, style, children }: CardProps) {
  const theme = useAppTheme();
  return (
    <View style={[styles.card, { backgroundColor: theme.surface }, padded && styles.padded, style]}>
      {title ? (
        <View style={[styles.header, !padded && styles.headerPadded]}>
          <Text style={[styles.title, { color: theme.ink }]}>{title}</Text>
          {action}
        </View>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 24, gap: 12, overflow: "hidden" },
  padded: { padding: 18 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerPadded: { paddingHorizontal: 18, paddingTop: 16 },
  title: { fontSize: 16, fontWeight: "700" },
});
