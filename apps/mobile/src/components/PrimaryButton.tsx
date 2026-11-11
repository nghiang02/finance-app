import { useTheme } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";

interface PrimaryButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  variant?: "solid" | "outline";
}

export function PrimaryButton({
  title,
  onPress,
  loading = false,
  variant = "solid",
}: PrimaryButtonProps) {
  const { colors } = useTheme();
  const solid = variant === "solid";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: loading, busy: loading }}
      disabled={loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        solid
          ? { backgroundColor: colors.primary }
          : { borderWidth: 1, borderColor: colors.border },
        (pressed || loading) && styles.dimmed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={solid ? "#ffffff" : colors.text} />
      ) : (
        <Text style={[styles.title, { color: solid ? "#ffffff" : colors.text }]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { borderRadius: 10, paddingVertical: 12, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 16, fontWeight: "600" },
  dimmed: { opacity: 0.6 },
});
