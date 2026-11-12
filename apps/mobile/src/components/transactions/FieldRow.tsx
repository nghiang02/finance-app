import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Icon, ICONS } from "@/components/Icon";
import { useAppTheme } from "@/lib/theme";

interface FieldRowProps {
  label: string;
  /** Selected value; when null, `placeholder` is shown in the muted color. */
  value: string | null;
  placeholder: string;
  leading: ReactNode;
  onPress: () => void;
  error?: string | undefined;
  separated?: boolean;
}

/** One form field shown as a tappable row ("Danh mục › Cà phê") that opens a picker. */
export function FieldRow({
  label,
  value,
  placeholder,
  leading,
  onPress,
  error,
  separated = false,
}: FieldRowProps) {
  const theme = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value ?? placeholder}`}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: theme.field }]}
    >
      {separated ? <View style={[styles.separator, { backgroundColor: theme.line }]} /> : null}
      <View style={styles.leading}>{leading}</View>
      <View style={styles.text}>
        <Text style={[styles.label, { color: error ? theme.expense : theme.muted }]}>
          {error ?? label}
        </Text>
        <Text style={[styles.value, { color: value ? theme.ink : theme.muted }]} numberOfLines={1}>
          {value ?? placeholder}
        </Text>
      </View>
      <Icon name={ICONS.chevronRight} size={14} color={theme.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  separator: { position: "absolute", top: 0, left: 68, right: 0, height: StyleSheet.hairlineWidth },
  leading: { width: 40, alignItems: "center" },
  text: { flex: 1, gap: 2 },
  label: { fontSize: 12.5, fontWeight: "600" },
  value: { fontSize: 16, fontWeight: "600" },
});
