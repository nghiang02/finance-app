import { useSession } from "@finance/api-client";
import { Redirect, Stack } from "expo-router";

import { useAppTheme } from "@/lib/theme";

/** Sign-in and sign-up, for signed-out users only. */
export default function AuthLayout() {
  const { status } = useSession();
  const theme = useAppTheme();

  if (status === "loading") {
    return null;
  }
  if (status === "authenticated") {
    // Signed in (or just signed up): go to the home screen.
    return <Redirect href="/" />;
  }

  return (
    <Stack
      screenOptions={{
        title: "",
        headerShadowVisible: false,
        headerStyle: { backgroundColor: theme.surface },
        headerBackButtonDisplayMode: "minimal",
      }}
    >
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
    </Stack>
  );
}
