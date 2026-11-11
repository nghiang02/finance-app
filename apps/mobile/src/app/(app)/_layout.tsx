import { useSession } from "@finance/api-client";
import { Redirect, Stack } from "expo-router";

/** Screens for signed-in users. Anyone else is sent to the sign-in screen. */
export default function AppLayout() {
  const { status } = useSession();

  if (status === "loading") {
    // The splash screen is still visible while the stored session is restored.
    return null;
  }
  if (status === "unauthenticated") {
    // <Redirect> replaces the current screen, so "back" cannot return here after sign-out.
    return <Redirect href="/login" />;
  }

  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "Finance" }} />
    </Stack>
  );
}
