import { Pressable, StyleSheet, Text, View } from "react-native";

import { useAppTheme } from "@/lib/theme";

export interface ChipOption<T extends string> {
  value: T;
  label: string;
}

interface ChipGroupProps<T extends string> {
  label?: string;
  options: readonly ChipOption<T>[];
  value: T;
  onChange: (value: T) => void;
  error?: string | undefined;
}

/**
 * Single choice shown as wrapping chips. Used instead of a picker library: every option is
 * visible at once and it needs no extra native module.
 */
export function ChipGroup<T extends string>({
  label,
  options,
  value,
  onChange,
  error,
}: ChipGroupProps<T>) {
  const theme = useAppTheme();
  return (
    <View style={styles.field}>
      {label ? <Text style={[styles.label, { color: theme.ink }]}>{label}</Text> : null}
      <View accessibilityRole="radiogroup" style={styles.chips}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              onPress={() => onChange(option.value)}
              style={[
                styles.chip,
                {
                  backgroundColor: selected ? theme.brandSoft : theme.field,
                  borderColor: selected ? theme.brand : "transparent",
                },
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: selected ? (theme.dark ? "#4CC966" : "#1B8236") : theme.ink },
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {error ? <Text style={[styles.error, { color: theme.expense }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 8 },
  label: { fontSize: 14, fontWeight: "600" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderWidth: 1.5, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  chipText: { fontSize: 14, fontWeight: "600" },
  error: { fontSize: 13 },
});
