import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack>
      {/* The first screen is where signed-out users land. */}
      <Stack.Screen name="login" options={{ title: "Đăng nhập" }} />
      <Stack.Screen name="register" options={{ title: "Tạo tài khoản" }} />
    </Stack>
  );
}
