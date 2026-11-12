import { Pressable, StyleSheet, Text, View } from "react-native";

import { useAppTheme } from "@/lib/theme";

interface SegmentedProps<T extends string> {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  /** "field" when placed on a white card. */
  background?: "surface" | "field";
}

/** Pill tabs, e.g. Khoản chi / Khoản thu. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  background = "surface",
}: SegmentedProps<T>) {
  const theme = useAppTheme();
  return (
    <View
      accessibilityRole="tablist"
      style={[
        styles.track,
        { backgroundColor: background === "field" ? theme.field : theme.surface },
      ]}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={[styles.option, selected && { backgroundColor: theme.brand }]}
          >
            <Text style={[styles.label, { color: selected ? "#FFFFFF" : theme.muted }]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: "row", borderRadius: 999, padding: 4 },
  option: { flex: 1, borderRadius: 999, paddingVertical: 10, alignItems: "center" },
  label: { fontSize: 14, fontWeight: "700" },
});
