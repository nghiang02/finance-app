import { CATEGORY_COLORS } from "@finance/shared";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Icon, ICONS } from "@/components/Icon";
import { useAppTheme } from "@/lib/theme";

interface ColorSwatchesProps {
  value: string | null | undefined;
  onChange: (color: string) => void;
  hint?: string | undefined;
}

export function ColorSwatches({ value, onChange, hint }: ColorSwatchesProps) {
  const theme = useAppTheme();
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: theme.ink }]}>Màu</Text>
      <View accessibilityRole="radiogroup" style={styles.swatches}>
        {CATEGORY_COLORS.map((color) => {
          const selected = color === value;
          return (
            <Pressable
              key={color}
              accessibilityRole="radio"
              accessibilityLabel={color}
              accessibilityState={{ checked: selected }}
              onPress={() => onChange(color)}
              style={[styles.ring, { borderColor: selected ? color : "transparent" }]}
            >
              <View style={[styles.swatch, { backgroundColor: color }]}>
                {selected ? <Icon name={ICONS.check} size={16} color="#FFFFFF" /> : null}
              </View>
            </Pressable>
          );
        })}
      </View>
      {hint ? <Text style={[styles.hint, { color: theme.muted }]}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 8 },
  label: { fontSize: 14, fontWeight: "600" },
  swatches: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  ring: { borderWidth: 2, borderRadius: 999, padding: 2 },
  swatch: {
    width: 32,
    height: 32,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  hint: { fontSize: 13 },
});
