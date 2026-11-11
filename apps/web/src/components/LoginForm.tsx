"use client";

import {
  describeError,
  type FieldErrors,
  serverFieldErrors,
  toFieldErrors,
  useSignIn,
} from "@finance/api-client";
import { loginRequestSchema } from "@finance/shared";
import Link from "next/link";
import { type FormEvent, useState } from "react";

import { TextField } from "@/components/TextField";

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
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {describeError(signIn.error, { UNAUTHORIZED: "Email hoặc mật khẩu không đúng." })}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={signIn.isPending}
        className="rounded-lg bg-zinc-900 px-4 py-2 font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        {signIn.isPending ? "Đang đăng nhập…" : "Đăng nhập"}
      </button>

      <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
        Chưa có tài khoản?{" "}
        <Link href="/register" className="font-medium text-zinc-900 underline dark:text-zinc-100">
          Đăng ký
        </Link>
      </p>
    </form>
  );
}
