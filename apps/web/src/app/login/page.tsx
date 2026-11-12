import type { Metadata } from "next";

import { AuthCard } from "@/components/AuthCard";
import { AuthGate } from "@/components/AuthGate";
import { LoginForm } from "@/components/LoginForm";

export const metadata: Metadata = { title: "Đăng nhập" };

export default function LoginPage() {
  return (
    <AuthCard title="Chào mừng trở lại 👋" subtitle="Đăng nhập để xem ví và chi tiêu của bạn.">
      <AuthGate mode="guest">
        <LoginForm />
      </AuthGate>
    </AuthCard>
  );
}
