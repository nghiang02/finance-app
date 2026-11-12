import { ChartPie, Shapes, ShieldCheck, Wallet } from "lucide-react";
import type { ReactNode } from "react";

import { Logo } from "@/components/ui/Logo";

const FEATURES = [
  { icon: Wallet, text: "Theo dõi mọi ví: tiền mặt, ngân hàng, thẻ, ví điện tử" },
  { icon: Shapes, text: "Danh mục thu chi rõ ràng, có sẵn bộ mặc định" },
  { icon: ChartPie, text: "Ngân sách và báo cáo theo tháng" },
  { icon: ShieldCheck, text: "Đồng bộ an toàn giữa web và điện thoại" },
] as const;

interface AuthCardProps {
  title: string;
  subtitle: string;
  children: ReactNode;
}

/** Split screen: brand panel on the left (large screens), form on the right. */
export function AuthCard({ title, subtitle, children }: AuthCardProps) {
  return (
    <main className="flex flex-1">
      <section className="relative hidden w-[46%] flex-col justify-between overflow-hidden bg-gradient-to-br from-brand-500 via-brand-600 to-brand-700 p-12 text-white lg:flex">
        <span aria-hidden className="absolute -top-24 -right-24 size-96 rounded-full bg-white/10" />
        <span
          aria-hidden
          className="absolute -bottom-32 -left-16 size-80 rounded-full bg-white/5"
        />

        <Logo inverted className="relative" />

        <div className="relative flex flex-col gap-8">
          <h2 className="max-w-md text-4xl leading-tight font-bold tracking-tight">
            Quản lý tiền bạc, nhẹ nhàng mỗi ngày.
          </h2>
          <ul className="flex flex-col gap-4">
            {FEATURES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-white/90">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/15">
                  <Icon aria-hidden className="size-4.5" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-sm text-white/70">Dự án cá nhân · NestJS · Next.js · Expo</p>
      </section>

      <section className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="flex w-full max-w-sm flex-col gap-8">
          <Logo className="lg:hidden" />
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
            <p className="text-muted">{subtitle}</p>
          </div>
          {children}
        </div>
      </section>
    </main>
  );
}
