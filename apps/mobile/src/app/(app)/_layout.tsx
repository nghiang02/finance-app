import { useSession } from "@finance/api-client";
import { Redirect, Stack } from "expo-router";

import { useAppTheme } from "@/lib/theme";

/** Screens for signed-in users. Anyone else is sent to the sign-in screen. */
export default function AppLayout() {
  const { status } = useSession();
  const theme = useAppTheme();

  if (status === "loading") {
    // The splash screen is still visible while the stored session is restored.
    return null;
  }
  if (status === "unauthenticated") {
    // <Redirect> replaces the current screen, so "back" cannot return here after sign-out.
    return <Redirect href="/login" />;
  }

  // Tabs at the bottom; create/edit screens open as modals on top of them.
  const modal = {
    presentation: "modal",
    headerStyle: { backgroundColor: theme.surface },
    headerShadowVisible: false,
    headerTitleStyle: { fontWeight: "700" },
  } as const;

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="wallets/new" options={{ ...modal, title: "Thêm ví mới" }} />
      <Stack.Screen name="wallets/[id]" options={{ ...modal, title: "Sửa ví" }} />
      <Stack.Screen
        name="categories/index"
        options={{
          title: "Danh mục",
          headerBackTitle: "Quay lại",
          headerStyle: { backgroundColor: theme.canvas },
          headerShadowVisible: false,
        }}
      />
      <Stack.Screen name="categories/new" options={{ ...modal, title: "Thêm danh mục" }} />
      <Stack.Screen name="categories/[id]" options={{ ...modal, title: "Sửa danh mục" }} />
      <Stack.Screen name="transactions/new" options={{ ...modal, title: "Thêm giao dịch" }} />
      <Stack.Screen name="transactions/[id]" options={{ ...modal, title: "Sửa giao dịch" }} />
    </Stack>
  );
}
