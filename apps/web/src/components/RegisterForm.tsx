"use client";

import { type FieldErrors, serverFieldErrors, toFieldErrors, useSignUp } from "@finance/api-client";
import { registerRequestSchema } from "@finance/shared";
import Link from "next/link";
import { type FormEvent, useState } from "react";

import { FormError } from "@/components/FormError";
import { TextField } from "@/components/TextField";
import { Button } from "@/components/ui/Button";

export function RegisterForm() {
  const signUp = useSignUp();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = registerRequestSchema.safeParse({
      email,
      password,
      // An empty name means "not provided", not "a name that is blank".
      ...(name.trim() ? { name } : {}),
    });
    const errors = parsed.success ? {} : toFieldErrors(parsed.error.issues);
    // Only the browser checks the confirmation; the server never receives it.
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
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <TextField
        id="name"
        label="Tên (không bắt buộc)"
        autoComplete="name"
        value={name}
        onChange={(event) => setName(event.target.value)}
        error={fieldErrors.name}
      />
      <TextField
        id="email"
        label="Email"
        type="email"
        autoComplete="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        error={fieldErrors.email}
      />
      <TextField
        id="password"
        label="Mật khẩu (ít nhất 8 ký tự)"
        type="password"
        autoComplete="new-password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        error={fieldErrors.password}
      />
      <TextField
        id="confirmPassword"
        label="Nhập lại mật khẩu"
        type="password"
        autoComplete="new-password"
        value={confirmPassword}
        onChange={(event) => setConfirmPassword(event.target.value)}
        error={fieldErrors.confirmPassword}
      />

      {signUp.isError ? (
        <FormError error={signUp.error} overrides={{ CONFLICT: "Email này đã được đăng ký." }} />
      ) : null}

      <Button type="submit" variant="primary" size="lg" disabled={signUp.isPending}>
        {signUp.isPending ? "Đang tạo tài khoản…" : "Tạo tài khoản"}
      </Button>

      <p className="text-center text-sm text-muted">
        Đã có tài khoản?{" "}
        <Link
          href="/login"
          className="font-semibold text-brand-600 hover:underline dark:text-brand-400"
        >
          Đăng nhập
        </Link>
      </p>
    </form>
  );
}
