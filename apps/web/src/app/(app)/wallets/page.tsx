import type { Metadata } from "next";

import { WalletsView } from "@/components/wallets/WalletsView";

export const metadata: Metadata = { title: "Ví" };

export default function WalletsPage() {
  return <WalletsView />;
}
