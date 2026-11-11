import type { ReactNode } from "react";

export function AuthCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="flex w-full max-w-sm flex-col gap-6 rounded-2xl border border-zinc-200 p-8 dark:border-zinc-800">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-zinc-500">Finance App</p>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        </div>
        {children}
      </div>
    </main>
  );
}
