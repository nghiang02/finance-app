import { router, Tabs } from "expo-router";
import { StyleSheet, View } from "react-native";

import { Icon, ICONS, type IconName } from "@/components/Icon";
import { BRAND, useAppTheme } from "@/lib/theme";

const TABS: readonly { name: string; title: string; icon: IconName }[] = [
  { name: "index", title: "Tổng quan", icon: ICONS.home },
  { name: "transactions", title: "Giao dịch", icon: ICONS.transactions },
  { name: "wallets", title: "Ví", icon: ICONS.wallet },
  { name: "account", title: "Tài khoản", icon: ICONS.account },
];

/**
 * Bottom tab bar with a raised "+" in the middle (like most finance apps): the fastest way to
 * record a transaction from anywhere. Each tab draws its own large-title header.
 */
export default function TabsLayout() {
  const theme = useAppTheme();
  const [first, second, ...rest] = TABS;
  const screen = (tab: (typeof TABS)[number]) => (
    <Tabs.Screen
      key={tab.name}
      name={tab.name}
      options={{
        title: tab.title,
        tabBarIcon: ({ color, size }) => <Icon name={tab.icon} size={size} color={color} />,
      }}
    />
  );

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.brand,
        tabBarInactiveTintColor: theme.muted,
        tabBarStyle: { backgroundColor: theme.surface, borderTopColor: theme.line },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      }}
    >
      {first ? screen(first) : null}
      {second ? screen(second) : null}
      <Tabs.Screen
        name="add"
        options={{
          title: "",
          tabBarAccessibilityLabel: "Thêm giao dịch",
          tabBarIcon: () => (
            <View style={[styles.add, { borderColor: theme.surface }]}>
              <Icon name={ICONS.plus} size={26} color="#FFFFFF" />
            </View>
          ),
        }}
        listeners={{
          tabPress: (event) => {
            // Open the quick-entry modal instead of switching to an empty tab.
            event.preventDefault();
            router.push("/transactions/new");
          },
        }}
      />
      {rest.map(screen)}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  add: {
    width: 56,
    height: 56,
    marginTop: -22,
    borderRadius: 999,
    borderWidth: 4,
    backgroundColor: BRAND[500],
    alignItems: "center",
    justifyContent: "center",
    shadowColor: BRAND[700],
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
});
