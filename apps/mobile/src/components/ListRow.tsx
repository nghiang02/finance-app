import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Icon, ICONS } from "@/components/Icon";
import { useAppTheme } from "@/lib/theme";

interface ListRowProps {
  leading?: ReactNode;
  title: string;
  subtitle?: string | undefined;
  trailing?: ReactNode;
  onPress?: () => void;
  chevron?: boolean;
  /** Separator line above the row (not for the first row). */
  separated?: boolean;
  /** Extra left padding for nested rows. */
  indent?: number;
  accessibilityLabel?: string;
}

export function ListRow({
  leading,
  title,
  subtitle,
  trailing,
  onPress,
  chevron = Boolean(onPress),
  separated = false,
  indent = 0,
  accessibilityLabel,
}: ListRowProps) {
  const theme = useAppTheme();
  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.row,
        { paddingLeft: 16 + indent },
        pressed && { backgroundColor: theme.field },
      ]}
    >
      {separated ? (
        <View style={[styles.separator, { left: 16 + indent, backgroundColor: theme.line }]} />
      ) : null}
      {leading}
      <View style={styles.text}>
        <Text style={[styles.title, { color: theme.ink }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: theme.muted }]} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing}
      {chevron ? <Icon name={ICONS.chevronRight} size={14} color={theme.muted} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingRight: 16,
    paddingVertical: 12,
  },
  separator: { position: "absolute", top: 0, right: 0, height: StyleSheet.hairlineWidth },
  text: { flex: 1, gap: 2 },
  title: { fontSize: 16, fontWeight: "600" },
  subtitle: { fontSize: 13 },
});
