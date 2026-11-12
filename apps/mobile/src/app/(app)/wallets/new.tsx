import { router } from "expo-router";

import { WalletForm } from "@/components/wallets/WalletForm";

export default function NewWalletScreen() {
  return <WalletForm onDone={() => router.back()} />;
}
