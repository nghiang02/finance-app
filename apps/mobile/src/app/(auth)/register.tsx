import { type FieldErrors, serverFieldErrors, toFieldErrors, useSignUp } from "@finance/api-client";
import { registerRequestSchema } from "@finance/shared";
import { Link, useTheme } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text } from "react-native";

import { AuthHeader } from "@/components/AuthHeader";
import { FormError } from "@/components/FormError";
import { FormScreen } from "@/components/FormScreen";
import { PrimaryButton } from "@/components/PrimaryButton";
import { TextField } from "@/components/TextField";

export default function RegisterScreen() {
  const { colors } = useTheme();
  const signUp = useSignUp();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  function handleSubmit() {
    const parsed = registerRequestSchema.safeParse({
      email,
      password,
      // An empty name means "not provided", not "a name that is blank".
      ...(name.trim() ? { name } : {}),
    });
    const errors = parsed.success ? {} : toFieldErrors(parsed.error.issues);
    // Only the app checks the confirmation; the server never receives it.
    if (password !== confirmPassword) {
      errors.confirmPassword = "Mật khẩu nhập lại không khớp";
    }
    setFieldErrors(errors);
    if (!parsed.success || Object.keys(errors).length > 0) {
      return;
    }
    signUp.mutate(parsed.data, { onError: (error) => setFieldErrors(serverFieldErrors(error)) });
  }

  return (
    <FormScreen>
      <AuthHeader title="Tạo tài khoản" subtitle="Miễn phí, chỉ cần email và mật khẩu." />
      <TextField
        label="Tên (không bắt buộc)"
        value={name}
        onChangeText={setName}
        error={fieldErrors.name}
        autoComplete="name"
        textContentType="name"
      />
      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        error={fieldErrors.email}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
      />
      <TextField
        label="Mật khẩu (ít nhất 8 ký tự)"
        value={password}
        onChangeText={setPassword}
        error={fieldErrors.password}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
      />
      <TextField
        label="Nhập lại mật khẩu"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        error={fieldErrors.confirmPassword}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="go"
        onSubmitEditing={handleSubmit}
      />

      <FormError error={signUp.error} overrides={{ CONFLICT: "Email này đã được đăng ký." }} />

      <PrimaryButton title="Tạo tài khoản" onPress={handleSubmit} loading={signUp.isPending} />

      <Text style={[styles.footer, { color: colors.text }]}>
        Đã có tài khoản?{" "}
        <Link href="/login" style={[styles.link, { color: colors.primary }]}>
          Đăng nhập
        </Link>
      </Text>
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  footer: { textAlign: "center", fontSize: 14 },
  link: { fontWeight: "600" },
});
