"use client";

import { useSession, useSignOut } from "@finance/api-client";
import { formatMoney } from "@finance/shared";

import { ApiStatus } from "@/components/ApiStatus";

export function HomeDashboard() {
  const { user } = useSession();
  const signOut = useSignOut();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-16">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-semibold tracking-tight">
            Xin chào{user?.name ? `, ${user.name}` : ""}!
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">{user?.email}</p>
        </div>
        <button
          type="button"
          onClick={() => signOut.mutate()}
          disabled={signOut.isPending}
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
        >
          {signOut.isPending ? "Đang đăng xuất…" : "Đăng xuất"}
        </button>
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
