import { formatMoney } from "@finance/shared";

import { ApiStatus } from "@/components/ApiStatus";

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-16">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Finance App</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Khung web đã nối với backend và các package dùng chung.
        </p>
      </header>

      <section className="flex flex-col gap-2 rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
        <h2 className="font-medium">Kết nối API</h2>
        <ApiStatus />
      </section>

      <section className="flex flex-col gap-2 rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
        <h2 className="font-medium">Định dạng tiền từ @finance/shared</h2>
        <p className="text-2xl font-semibold tabular-nums">{formatMoney(1_500_000)}</p>
      </section>
    </main>
  );
}
