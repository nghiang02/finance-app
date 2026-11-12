import { useDeleteTransaction, useTransaction } from "@finance/api-client";
import { router, useLocalSearchParams } from "expo-router";
import { Alert } from "react-native";

import { ICONS } from "@/components/Icon";
import { PrimaryButton } from "@/components/PrimaryButton";
import { QueryState } from "@/components/QueryState";
import { TransactionForm } from "@/components/transactions/TransactionForm";

export default function EditTransactionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const transaction = useTransaction(id);
  const deleteTransaction = useDeleteTransaction();

  if (!transaction.data) {
    return (
      <QueryState
        error={transaction.error}
        onRetry={() => void transaction.refetch()}
        retrying={transaction.isFetching}
      />
    );
  }

  function confirmDelete() {
    Alert.alert("Xóa giao dịch?", "Số dư ví sẽ được tính lại như chưa có giao dịch này.", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: () =>
          deleteTransaction.mutate(id, {
            onSuccess: () => router.back(),
            onError: () => Alert.alert("Không xóa được giao dịch", "Vui lòng thử lại."),
          }),
      },
    ]);
  }

  return (
    <TransactionForm
      // key: a refetched transaction resets the form instead of mixing old and new values.
      key={transaction.data.updatedAt}
      target={{ mode: "edit", transaction: transaction.data }}
      onDone={() => router.back()}
      footer={
        <PrimaryButton
          title="Xóa giao dịch"
          variant="danger"
          icon={ICONS.trash}
          onPress={confirmDelete}
          loading={deleteTransaction.isPending}
        />
      }
    />
  );
}
