import { SymbolView, type SymbolViewProps } from "expo-symbols";
import type { ColorValue } from "react-native";

/** SF Symbol on iOS, Material Symbol on Android: icons look native on each platform. */
export type IconName = Required<Pick<Exclude<SymbolViewProps["name"], string>, "ios" | "android">>;

/** Every icon the app uses, in one place. */
export const ICONS = {
  home: { ios: "house.fill", android: "home" },
  wallet: { ios: "wallet.bifold.fill", android: "account_balance_wallet" },
  categories: { ios: "square.grid.2x2.fill", android: "category" },
  account: { ios: "person.crop.circle.fill", android: "person" },
  plus: { ios: "plus", android: "add" },
  eye: { ios: "eye.fill", android: "visibility" },
  eyeOff: { ios: "eye.slash.fill", android: "visibility_off" },
  chevronRight: { ios: "chevron.right", android: "chevron_right" },
  trash: { ios: "trash", android: "delete" },
  logout: { ios: "rectangle.portrait.and.arrow.right", android: "logout" },
  check: { ios: "checkmark", android: "check" },
  cash: { ios: "banknote.fill", android: "payments" },
  bank: { ios: "building.columns.fill", android: "account_balance" },
  card: { ios: "creditcard.fill", android: "credit_card" },
  phone: { ios: "iphone", android: "smartphone" },
  other: { ios: "wallet.pass.fill", android: "wallet" },
  server: { ios: "server.rack", android: "dns" },
  offline: { ios: "icloud.slash", android: "cloud_off" },
  piggy: { ios: "dollarsign.circle.fill", android: "savings" },
  transactions: { ios: "list.bullet.rectangle.fill", android: "receipt_long" },
  transfer: { ios: "arrow.left.arrow.right", android: "swap_horiz" },
  chevronLeft: { ios: "chevron.left", android: "chevron_left" },
  calendar: { ios: "calendar", android: "calendar_today" },
} as const satisfies Record<string, IconName>;

interface IconProps {
  name: IconName;
  size?: number;
  color: ColorValue;
}

export function Icon({ name, size = 22, color }: IconProps) {
  return <SymbolView name={name} size={size} tintColor={color} weight="semibold" />;
}
