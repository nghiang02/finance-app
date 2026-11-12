"use client";

import { useCategories, useSession, useWallets } from "@finance/api-client";
import { buildCategoryTree, WALLET_TYPE_LABELS } from "@finance/shared";
import { ChevronRight, Plus, Shapes, Wallet } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { ApiStatus } from "@/components/ApiStatus";
import { CategoryAvatar } from "@/components/categories/CategoryAvatar";
import { CategoryFormDialog } from "@/components/categories/CategoryFormDialog";
import { Card } from "@/components/ui/Card";
import { Money } from "@/components/ui/Money";
import { Skeleton } from "@/components/ui/Skeleton";
import { BalanceCard } from "@/components/wallets/BalanceCard";
import { WalletFormDialog } from "@/components/wallets/WalletFormDialog";
import { WalletIcon } from "@/components/wallets/WalletIcon";
import { useBalanceVisibility } from "@/lib/balance-visibility";

export function HomeDashboard() {
  const { user } = useSession();
  const wallets = useWallets();
  const categories = useCategories();
  const { hidden } = useBalanceVisibility();
  const [dialog, setDialog] = useState<"wallet" | "category" | null>(null);

  const name = user?.name ?? user?.email.split("@")[0] ?? "";
  const today = new Intl.DateTimeFormat("vi-VN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: user?.timezone ?? "Asia/Ho_Chi_Minh",
  }).format(new Date());
  const activeWallets = (wallets.data ?? []).filter((wallet) => !wallet.archived);
  const expenseRoots = buildCategoryTree(
    (categories.data ?? []).filter((category) => category.type === "EXPENSE"),
  );

  return (
    <>
      <div className="flex flex-col gap-1">
        <p className="text-sm text-muted first-letter:uppercase">{today}</p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Xin chào, {name} 👋</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {wallets.data ? <BalanceCard wallets={wallets.data} /> : <Skeleton className="h-44" />}
        </div>
        <Card title="Thao tác nhanh">
          <div className="grid grid-cols-2 gap-3">
            <QuickAction icon={Wallet} label="Thêm ví" onClick={() => setDialog("wallet")} />
            <QuickAction
              icon={Shapes}
              label="Thêm danh mục"
              onClick={() => setDialog("category")}
            />
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Ví của tôi" link={{ href: "/wallets", label: "Xem tất cả" }}>
          {!wallets.data ? (
            <Skeleton className="h-32 bg-field" />
          ) : activeWallets.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">
              Chưa có ví nào.{" "}
              <button
                type="button"
                onClick={() => setDialog("wallet")}
                className="font-semibold text-brand-600 hover:underline"
              >
                Thêm ví đầu tiên
              </button>
            </p>
          ) : (
            <ul className="-mx-2 flex flex-col">
              {activeWallets.slice(0, 5).map((wallet) => (
                <li key={wallet.id}>
                  <Link
                    href="/wallets"
                    className="flex items-center gap-3 rounded-2xl px-2 py-2.5 transition hover:bg-field"
                  >
                    <WalletIcon type={wallet.type} size="sm" />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate font-medium">{wallet.name}</span>
                      <span className="text-xs text-muted">{WALLET_TYPE_LABELS[wallet.type]}</span>
                    </span>
                    <Money
                      amount={wallet.balance}
                      currency={wallet.currency}
                      hidden={hidden}
                      className="font-semibold"
                    />
                    <ChevronRight aria-hidden className="size-4 text-muted" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Danh mục chi tiêu" link={{ href: "/categories", label: "Quản lý" }}>
          {!categories.data ? (
            <Skeleton className="h-32 bg-field" />
          ) : (
            <ul className="grid grid-cols-3 gap-x-2 gap-y-4 sm:grid-cols-4">
              {expenseRoots.slice(0, 8).map((category) => (
                <li key={category.id} className="flex flex-col items-center gap-2 text-center">
                  <CategoryAvatar icon={category.icon} color={category.color} />
                  <span className="line-clamp-2 text-xs font-medium">{category.name}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <ApiStatus />

      <WalletFormDialog open={dialog === "wallet"} onClose={() => setDialog(null)} />
      <CategoryFormDialog
        target={dialog === "category" ? { mode: "create", type: "EXPENSE", parentId: null } : null}
        categories={categories.data ?? []}
        onClose={() => setDialog(null)}
      />
    </>
  );
}

function QuickAction({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof Wallet;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col items-center gap-2 rounded-2xl bg-field px-3 py-4 text-sm font-medium transition hover:bg-brand-50 hover:text-brand-700 dark:hover:bg-brand-900/40 dark:hover:text-brand-400"
    >
      <span className="relative flex size-11 items-center justify-center rounded-full bg-surface text-brand-600 shadow-sm">
        <Icon aria-hidden className="size-5" />
        <Plus
          aria-hidden
          className="absolute -right-0.5 -bottom-0.5 size-4 rounded-full bg-brand-500 p-0.5 text-white"
          strokeWidth={3}
        />
      </span>
      {label}
    </button>
  );
}
