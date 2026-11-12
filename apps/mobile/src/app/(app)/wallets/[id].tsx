import { useDeleteWallet, useWallets } from "@finance/api-client";
import { router, useLocalSearchParams } from "expo-router";
import { Alert } from "react-native";

import { PrimaryButton } from "@/components/PrimaryButton";
import { EmptyState, QueryState } from "@/components/QueryState";
import { WalletForm } from "@/components/wallets/WalletForm";

export default function EditWalletScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  // Reads the list already in the cache instead of a separate "get one" request.
  const wallets = useWallets();
  const deleteWallet = useDeleteWallet();

  if (!wallets.data) {
    return (
      <QueryState
        error={wallets.error}
        onRetry={() => void wallets.refetch()}
        retrying={wallets.isFetching}
      />
    );
  }
  const wallet = wallets.data.find((item) => item.id === id);
  if (!wallet) {
    return <EmptyState message="Không tìm thấy ví." />;
  }

  function confirmDelete(name: string, walletId: string) {
    Alert.alert(
      "Xóa ví?",
      `Ví “${name}” sẽ biến mất khỏi danh sách. Giao dịch của ví vẫn được giữ để báo cáo các tháng trước không bị sai. Nếu chỉ muốn ẩn ví, hãy bật “Lưu trữ ví”.`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: () =>
            deleteWallet.mutate(walletId, {
              onSuccess: () => router.back(),
              onError: () => Alert.alert("Không xóa được ví", "Vui lòng thử lại."),
            }),
        },
      ],
    );
  }

  return (
    <WalletForm
      wallet={wallet}
      onDone={() => router.back()}
      footer={
        <PrimaryButton
          title="Xóa ví"
          variant="danger"
          onPress={() => confirmDelete(wallet.name, wallet.id)}
          loading={deleteWallet.isPending}
        />
      }
    />
  );
}
