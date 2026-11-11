import type { Metadata } from "next";

import { AuthCard } from "@/components/AuthCard";
import { AuthGate } from "@/components/AuthGate";
import { LoginForm } from "@/components/LoginForm";

export const metadata: Metadata = { title: "Đăng nhập" };

export default function LoginPage() {
  return (
    <AuthCard title="Đăng nhập">
      <AuthGate mode="guest">
        <LoginForm />
      </AuthGate>
    </AuthCard>
  );
}
