"use client";

import { useDeleteWallet, useWallets } from "@finance/api-client";
import { type Wallet, WALLET_TYPE_LABELS } from "@finance/shared";
import { Archive, Plus, Trash2, Wallet as WalletGlyph } from "lucide-react";
import { useState } from "react";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import { QueryStatus } from "@/components/QueryStatus";
import { Button, IconButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Money } from "@/components/ui/Money";
import { PageHeader } from "@/components/ui/PageHeader";
import { BalanceCard } from "@/components/wallets/BalanceCard";
import { WalletFormDialog } from "@/components/wallets/WalletFormDialog";
import { WalletIcon } from "@/components/wallets/WalletIcon";
import { useBalanceVisibility } from "@/lib/balance-visibility";

/** Which dialog is open. One state instead of several booleans: only one can be open. */
type DialogState =
  | { kind: "none" }
  | { kind: "create" }
  | { kind: "edit"; wallet: Wallet }
  | { kind: "delete"; wallet: Wallet };

export function WalletsView() {
  const wallets = useWallets();
  const deleteWallet = useDeleteWallet();
  const [dialog, setDialog] = useState<DialogState>({ kind: "none" });
  const close = () => {
    deleteWallet.reset();
    setDialog({ kind: "none" });
  };
  const create = () => setDialog({ kind: "create" });

  return (
    <>
      <PageHeader
        title="Ví của tôi"
        description="Tiền mặt, tài khoản ngân hàng, thẻ và ví điện tử."
        action={
          <Button variant="primary" icon={Plus} onClick={create}>
            Thêm ví
          </Button>
        }
      />

      {!wallets.data ? (
        <QueryStatus
          error={wallets.error}
          onRetry={() => void wallets.refetch()}
          retrying={wallets.isFetching}
        />
      ) : wallets.data.length === 0 ? (
        <EmptyState
          icon={WalletGlyph}
          title="Chưa có ví nào"
          description="Tạo ví đầu tiên, ví dụ “Tiền mặt” hoặc tài khoản ngân hàng, để bắt đầu theo dõi số dư."
          action={
            <Button variant="primary" icon={Plus} onClick={create}>
              Thêm ví
            </Button>
          }
        />
      ) : (
        <>
          <BalanceCard wallets={wallets.data} />
          <WalletGrid
            title="Đang dùng"
            wallets={wallets.data.filter((wallet) => !wallet.archived)}
            onSelect={setDialog}
            onCreate={create}
          />
          <WalletGrid
            title="Đã lưu trữ"
            wallets={wallets.data.filter((wallet) => wallet.archived)}
            onSelect={setDialog}
          />
        </>
      )}

      <WalletFormDialog
        open={dialog.kind === "create" || dialog.kind === "edit"}
        onClose={close}
        wallet={dialog.kind === "edit" ? dialog.wallet : undefined}
      />
      <ConfirmDialog
        open={dialog.kind === "delete"}
        onClose={close}
        title="Xóa ví?"
        confirmLabel="Xóa ví"
        pending={deleteWallet.isPending}
        error={deleteWallet.error}
        onConfirm={() => {
          if (dialog.kind === "delete") {
            deleteWallet.mutate(dialog.wallet.id, { onSuccess: close });
          }
        }}
      >
        <p>
          Ví{" "}
          <strong className="text-ink">{dialog.kind === "delete" ? dialog.wallet.name : ""}</strong>{" "}
          sẽ biến mất khỏi danh sách. Giao dịch của ví vẫn được giữ để báo cáo các tháng trước không
          bị sai.
        </p>
        <p>Chỉ muốn ẩn ví khỏi tổng số dư? Hãy sửa ví và bật “Lưu trữ ví”.</p>
      </ConfirmDialog>
    </>
  );
}

function WalletGrid({
  title,
  wallets,
  onSelect,
  onCreate,
}: {
  title: string;
  wallets: Wallet[];
  onSelect: (dialog: DialogState) => void;
  onCreate?: () => void;
}) {
  const { hidden } = useBalanceVisibility();
  if (wallets.length === 0 && !onCreate) {
    return null;
  }
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-muted">
        {title} · {wallets.length}
      </h2>
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {wallets.map((wallet) => (
          <li key={wallet.id} className="group relative">
            <button
              type="button"
              onClick={() => onSelect({ kind: "edit", wallet })}
              aria-label={`Sửa ví ${wallet.name}`}
              className="flex w-full flex-col gap-5 rounded-3xl bg-surface p-5 text-left transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/5 focus-visible:ring-4 focus-visible:ring-brand-500/25 focus-visible:outline-none"
            >
              <span className="flex items-center gap-3 pr-10">
                <WalletIcon type={wallet.type} />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate font-semibold">{wallet.name}</span>
                  <span className="flex items-center gap-1.5 text-xs text-muted">
                    {WALLET_TYPE_LABELS[wallet.type]}
                    {wallet.archived ? (
                      <>
                        ·
                        <Archive aria-hidden className="size-3" /> Lưu trữ
                      </>
                    ) : null}
                  </span>
                </span>
              </span>
              <span className="flex flex-col gap-0.5">
                <span className="text-xs text-muted">Số dư</span>
                <Money
                  amount={wallet.balance}
                  currency={wallet.currency}
                  hidden={hidden}
                  className="text-xl font-bold tracking-tight"
                />
              </span>
            </button>
            <IconButton
              icon={Trash2}
              label={`Xóa ví ${wallet.name}`}
              tone="danger"
              onClick={() => onSelect({ kind: "delete", wallet })}
              className="absolute top-4 right-4 transition sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
            />
          </li>
        ))}
        {onCreate ? (
          <li>
            <button
              type="button"
              onClick={onCreate}
              className="flex h-full min-h-36 w-full flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-line text-sm font-semibold text-muted transition hover:border-brand-500 hover:text-brand-600"
            >
              <Plus aria-hidden className="size-6" />
              Thêm ví
            </button>
          </li>
        ) : null}
      </ul>
    </section>
  );
}
