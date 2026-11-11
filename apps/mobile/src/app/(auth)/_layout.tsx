import { useSession } from "@finance/api-client";
import { Redirect, Stack } from "expo-router";

/** Sign-in and sign-up, for signed-out users only. */
export default function AuthLayout() {
  const { status } = useSession();

  if (status === "loading") {
    return null;
  }
  if (status === "authenticated") {
    // Signed in (or just signed up): go to the home screen.
    return <Redirect href="/" />;
  }

  return (
    <Stack>
      <Stack.Screen name="login" options={{ title: "Đăng nhập" }} />
      <Stack.Screen name="register" options={{ title: "Tạo tài khoản" }} />
    </Stack>
  );
}
