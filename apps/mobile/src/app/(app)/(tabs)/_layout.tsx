import { Tabs } from "expo-router";

import { Icon, ICONS, type IconName } from "@/components/Icon";
import { useAppTheme } from "@/lib/theme";

const TABS: readonly { name: string; title: string; icon: IconName }[] = [
  { name: "index", title: "Tổng quan", icon: ICONS.home },
  { name: "wallets", title: "Ví", icon: ICONS.wallet },
  { name: "categories", title: "Danh mục", icon: ICONS.categories },
  { name: "account", title: "Tài khoản", icon: ICONS.account },
];

/** Bottom tab bar. Each tab draws its own large-title header (ScreenHeader). */
export default function TabsLayout() {
  const theme = useAppTheme();
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
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ color, size }) => <Icon name={tab.icon} size={size} color={color} />,
          }}
        />
      ))}
    </Tabs>
  );
}
