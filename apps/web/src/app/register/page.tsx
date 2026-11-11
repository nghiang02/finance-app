import type { Metadata } from "next";

import { AuthCard } from "@/components/AuthCard";
import { AuthGate } from "@/components/AuthGate";
import { RegisterForm } from "@/components/RegisterForm";

export const metadata: Metadata = { title: "Đăng ký" };

export default function RegisterPage() {
  return (
    <AuthCard title="Tạo tài khoản">
      <AuthGate mode="guest">
        <RegisterForm />
      </AuthGate>
    </AuthCard>
  );
}
