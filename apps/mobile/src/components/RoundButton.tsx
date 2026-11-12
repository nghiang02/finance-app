import { Pressable, StyleSheet } from "react-native";

import { Icon, type IconName } from "@/components/Icon";
import { useAppTheme } from "@/lib/theme";

interface RoundButtonProps {
  icon: IconName;
  label: string;
  onPress: () => void;
  variant?: "brand" | "soft";
  size?: number;
}

/** Circular icon button, e.g. the "+" in screen headers. */
export function RoundButton({
  icon,
  label,
  onPress,
  variant = "brand",
  size = 44,
}: RoundButtonProps) {
  const theme = useAppTheme();
  const brand = variant === "brand";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [
        styles.button,
        { width: size, height: size, backgroundColor: brand ? theme.brand : theme.field },
        brand && styles.shadow,
        pressed && styles.pressed,
      ]}
    >
      <Icon name={icon} size={size * 0.45} color={brand ? "#FFFFFF" : theme.ink} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { borderRadius: 999, alignItems: "center", justifyContent: "center" },
  shadow: {
    shadowColor: "#22A043",
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  pressed: { opacity: 0.7, transform: [{ scale: 0.96 }] },
});
