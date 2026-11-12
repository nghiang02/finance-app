import { StyleSheet, Switch, Text, View } from "react-native";

import { useAppTheme } from "@/lib/theme";

interface SwitchRowProps {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (value: boolean) => void;
}

export function SwitchRow({ label, hint, value, onChange }: SwitchRowProps) {
  const theme = useAppTheme();
  return (
    <View style={[styles.row, { backgroundColor: theme.field }]}>
      <View style={styles.text}>
        <Text style={[styles.label, { color: theme.ink }]}>{label}</Text>
        {hint ? <Text style={[styles.hint, { color: theme.muted }]}>{hint}</Text> : null}
      </View>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onChange}
        trackColor={{ true: theme.brand, false: theme.line }}
        thumbColor="#FFFFFF"
        ios_backgroundColor={theme.line}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  text: { flex: 1, gap: 2 },
  label: { fontSize: 15, fontWeight: "600" },
  hint: { fontSize: 13 },
});
