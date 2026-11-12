import { formatMoney } from "@finance/shared";
import { Text, type TextStyle } from "react-native";

import { useAppTheme } from "@/lib/theme";

interface MoneyProps {
  amount: number;
  currency?: string;
  hidden?: boolean;
  /** Color negative amounts as expense (red). */
  signed?: boolean;
  style?: TextStyle | TextStyle[];
}

export function Money({
  amount,
  currency = "VND",
  hidden = false,
  signed = true,
  style,
}: MoneyProps) {
  const theme = useAppTheme();
  return (
    <Text
      style={[
        { color: signed && amount < 0 ? theme.expense : theme.ink, fontVariant: ["tabular-nums"] },
        style,
      ]}
    >
      {hidden ? "••••••• ₫" : formatMoney(amount, currency)}
    </Text>
  );
}
