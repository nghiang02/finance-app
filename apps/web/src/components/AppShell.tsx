"use client";

import { useSession, useSignOut } from "@finance/api-client";
import { LayoutDashboard, LogOut, type LucideIcon, Shapes, Wallet } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { Logo } from "@/components/ui/Logo";
import { cx } from "@/lib/cx";

interface NavItem {
  href: "/" | "/wallets" | "/categories";
  label: string;
  icon: LucideIcon;
}

const NAV_ITEMS: readonly NavItem[] = [
  { href: "/", label: "Tổng quan", icon: LayoutDashboard },
  { href: "/wallets", label: "Ví", icon: Wallet },
  { href: "/categories", label: "Danh mục", icon: Shapes },
];

function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

/** Sidebar on large screens, bottom tab bar on phones (like a native finance app). */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user } = useSession();
  const signOut = useSignOut();
  const initial = (user?.name ?? user?.email ?? "?").charAt(0).toUpperCase();

  return (
    <div className="flex min-h-full flex-1">
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-line bg-surface px-4 py-6 lg:flex">
        <Logo className="px-3" />
        <nav aria-label="Điều hướng chính" className="mt-8 flex flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cx(
                  "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition",
                  active
                    ? "bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-400"
                    : "text-muted hover:bg-field hover:text-ink",
                )}
              >
                <item.icon aria-hidden className="size-5" strokeWidth={active ? 2.25 : 2} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto flex items-center gap-3 rounded-2xl bg-field p-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-500 font-semibold text-white">
            {initial}
          </span>
          <span className="min-w-0 flex-1 truncate text-sm font-medium">
            {user?.name ?? user?.email}
          </span>
          <button
            type="button"
            onClick={() => signOut.mutate()}
            disabled={signOut.isPending}
            aria-label="Đăng xuất"
            title="Đăng xuất"
            className="inline-flex size-8 items-center justify-center rounded-full text-muted transition hover:bg-surface hover:text-expense disabled:opacity-50"
          >
            <LogOut aria-hidden className="size-4" />
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-surface/80 px-5 py-3 backdrop-blur lg:hidden">
          <Logo />
          <button
            type="button"
            onClick={() => signOut.mutate()}
            disabled={signOut.isPending}
            aria-label="Đăng xuất"
            className="inline-flex size-9 items-center justify-center rounded-full text-muted hover:bg-field hover:text-expense"
          >
            <LogOut aria-hidden className="size-4.5" />
          </button>
        </header>

        <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-5 pt-6 pb-28 sm:px-8 lg:py-10">
          {children}
        </main>

        <nav
          aria-label="Điều hướng chính"
          className="fixed inset-x-0 bottom-0 z-10 flex border-t border-line bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
        >
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cx(
                  "flex flex-1 flex-col items-center gap-1 py-2.5 text-xs font-medium",
                  active ? "text-brand-600 dark:text-brand-400" : "text-muted",
                )}
              >
                <item.icon aria-hidden className="size-5.5" strokeWidth={active ? 2.25 : 2} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
