import { StyleSheet, Text, View } from "react-native";

import { Icon, ICONS } from "@/components/Icon";
import { tint } from "@/lib/theme";

const FALLBACK_COLOR = "#98A2B3";

interface CategoryAvatarProps {
  icon: string | null;
  color: string | null;
  size?: number;
}

/** Emoji on a circle tinted with the category color. */
export function CategoryAvatar({ icon, color, size = 44 }: CategoryAvatarProps) {
  const base = color ?? FALLBACK_COLOR;
  return (
    <View
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          backgroundColor: tint(base, 0.18),
          borderColor: tint(base, 0.35),
        },
      ]}
    >
      {icon ? (
        <Text style={{ fontSize: size * 0.48 }}>{icon}</Text>
      ) : (
        <Icon name={ICONS.categories} size={size * 0.45} color={base} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { borderRadius: 999, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
});
