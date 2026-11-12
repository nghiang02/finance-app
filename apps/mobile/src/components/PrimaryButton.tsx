import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";

import { Icon, type IconName } from "@/components/Icon";
import { useAppTheme } from "@/lib/theme";

interface PrimaryButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  /** solid = brand green, soft = gray, danger = red text on a light red background. */
  variant?: "solid" | "soft" | "danger";
  icon?: IconName;
}

export function PrimaryButton({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = "solid",
  icon,
}: PrimaryButtonProps) {
  const theme = useAppTheme();
  const background =
    variant === "solid" ? theme.brand : variant === "danger" ? `${theme.expense}1A` : theme.field;
  const textColor =
    variant === "solid" ? "#FFFFFF" : variant === "danger" ? theme.expense : theme.ink;
  const inactive = loading || disabled;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: background },
        variant === "solid" && styles.shadow,
        (pressed || inactive) && styles.dimmed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <>
          {icon ? <Icon name={icon} size={18} color={textColor} /> : null}
          <Text style={[styles.title, { color: textColor }]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    gap: 8,
    height: 54,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  shadow: {
    shadowColor: "#22A043",
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  title: { fontSize: 16, fontWeight: "700" },
  dimmed: { opacity: 0.6 },
});
