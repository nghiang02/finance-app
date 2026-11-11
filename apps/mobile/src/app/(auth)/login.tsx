import {
  describeError,
  type FieldErrors,
  serverFieldErrors,
  toFieldErrors,
  useSignIn,
} from "@finance/api-client";
import { loginRequestSchema } from "@finance/shared";
import { Link, useTheme } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text } from "react-native";

import { FormScreen } from "@/components/FormScreen";
import { PrimaryButton } from "@/components/PrimaryButton";
import { TextField } from "@/components/TextField";

export default function LoginScreen() {
  const { colors } = useTheme();
  const signIn = useSignIn();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  function handleSubmit() {
    // Same schema as the server: instant feedback without a round trip.
    const parsed = loginRequestSchema.safeParse({ email, password });
    if (!parsed.success) {
      setFieldErrors(toFieldErrors(parsed.error.issues));
      return;
    }
    setFieldErrors({});
    // On success the session becomes "authenticated" and the root layout switches to (app).
    signIn.mutate(parsed.data, { onError: (error) => setFieldErrors(serverFieldErrors(error)) });
  }

  return (
    <FormScreen>
      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        error={fieldErrors.email}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
        returnKeyType="next"
      />
      <TextField
        label="Mật khẩu"
        value={password}
        onChangeText={setPassword}
        error={fieldErrors.password}
        secureTextEntry
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={handleSubmit}
      />

      {signIn.isError ? (
        <Text accessibilityRole="alert" style={styles.formError}>
          {describeError(signIn.error, { UNAUTHORIZED: "Email hoặc mật khẩu không đúng." })}
        </Text>
      ) : null}

      <PrimaryButton title="Đăng nhập" onPress={handleSubmit} loading={signIn.isPending} />

      <Text style={[styles.footer, { color: colors.text }]}>
        Chưa có tài khoản?{" "}
        <Link href="/register" style={[styles.link, { color: colors.primary }]}>
          Đăng ký
        </Link>
      </Text>
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  formError: { color: "#dc2626", fontSize: 14 },
  footer: { textAlign: "center", fontSize: 14 },
  link: { fontWeight: "600" },
});
