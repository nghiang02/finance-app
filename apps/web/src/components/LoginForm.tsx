"use client";

import { type FieldErrors, serverFieldErrors, toFieldErrors, useSignIn } from "@finance/api-client";
import { loginRequestSchema } from "@finance/shared";
import Link from "next/link";
import { type FormEvent, useState } from "react";

import { FormError } from "@/components/FormError";
import { TextField } from "@/components/TextField";
import { Button } from "@/components/ui/Button";

export function LoginForm() {
  const signIn = useSignIn();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Same schema as the server: instant feedback without a round trip.
    const parsed = loginRequestSchema.safeParse({ email, password });
    if (!parsed.success) {
      setFieldErrors(toFieldErrors(parsed.error.issues));
      return;
    }
    setFieldErrors({});
    // On success the session becomes "authenticated" and <AuthGate mode="guest"> redirects to "/".
    signIn.mutate(parsed.data, { onError: (error) => setFieldErrors(serverFieldErrors(error)) });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
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
        label="Mật khẩu"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        error={fieldErrors.password}
      />

      {signIn.isError ? (
        <FormError
          error={signIn.error}
          overrides={{ UNAUTHORIZED: "Email hoặc mật khẩu không đúng." }}
        />
      ) : null}

      <Button type="submit" variant="primary" size="lg" disabled={signIn.isPending}>
        {signIn.isPending ? "Đang đăng nhập…" : "Đăng nhập"}
      </Button>

      <p className="text-center text-sm text-muted">
        Chưa có tài khoản?{" "}
        <Link
          href="/register"
          className="font-semibold text-brand-600 hover:underline dark:text-brand-400"
        >
          Đăng ký
        </Link>
      </p>
    </form>
  );
}
