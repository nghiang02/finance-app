import { useWallets } from "@finance/api-client";
import type { TransactionType } from "@finance/shared";
import { router, useLocalSearchParams } from "expo-router";

import { EmptyState, QueryState } from "@/components/QueryState";
import { TransactionForm } from "@/components/transactions/TransactionForm";
import { ICONS } from "@/components/Icon";
import { defaultWalletId } from "@/lib/last-wallet";

const TYPES: readonly TransactionType[] = ["EXPENSE", "INCOME", "TRANSFER"];

export default function NewTransactionScreen() {
  const params = useLocalSearchParams<{ type?: string }>();
  const wallets = useWallets();
  // URL params are untrusted strings: only a known type is used.
  const type = TYPES.find((value) => value === params.type) ?? "EXPENSE";

  if (!wallets.data) {
    return (
      <QueryState
        error={wallets.error}
        onRetry={() => void wallets.refetch()}
        retrying={wallets.isFetching}
      />
    );
  }
  const walletId = defaultWalletId(wallets.data);
  if (!walletId) {
    return (
      <EmptyState
        icon={ICONS.wallet}
        title="Chưa có ví"
        message="Tạo một ví ở tab Ví trước, ví dụ “Tiền mặt”, rồi quay lại ghi giao dịch."
      />
    );
  }
  return (
    <TransactionForm target={{ mode: "create", type, walletId }} onDone={() => router.back()} />
  );
}
