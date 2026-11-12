import { StyleSheet, Text, View } from "react-native";

import { Icon, ICONS } from "@/components/Icon";
import { useAppTheme } from "@/lib/theme";

export function AuthHeader({ title, subtitle }: { title: string; subtitle: string }) {
  const theme = useAppTheme();
  return (
    <View style={styles.header}>
      <View style={[styles.logo, { backgroundColor: theme.brand }]}>
        <Icon name={ICONS.piggy} size={30} color="#FFFFFF" />
      </View>
      <Text style={[styles.title, { color: theme.ink }]}>{title}</Text>
      <Text style={[styles.subtitle, { color: theme.muted }]}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { gap: 8, marginBottom: 8 },
  logo: {
    width: 60,
    height: 60,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    shadowColor: "#22A043",
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  title: { fontSize: 28, fontWeight: "800", letterSpacing: -0.5 },
  subtitle: { fontSize: 15, lineHeight: 21 },
});
