import type { CategoryType } from "./schemas/category.js";

export interface DefaultSubcategory {
  name: string;
  icon: string;
}

export interface DefaultCategory {
  name: string;
  type: CategoryType;
  /** Emoji: renders the same on web and mobile without an icon library. */
  icon: string;
  /** Children inherit this color and type. */
  color: string;
  children?: readonly DefaultSubcategory[];
}

/**
 * Created for every new account (in the same transaction as the user), so the first
 * transaction can be recorded right after sign-up. Users can rename, recolor or delete them.
 */
export const DEFAULT_CATEGORIES: readonly DefaultCategory[] = [
  // Expenses
  {
    name: "Ăn uống",
    type: "EXPENSE",
    icon: "🍜",
    color: "#F97316",
    children: [
      { name: "Cà phê", icon: "☕" },
      { name: "Đi chợ", icon: "🛒" },
    ],
  },
  {
    name: "Di chuyển",
    type: "EXPENSE",
    icon: "🛵",
    color: "#3B82F6",
    children: [
      { name: "Xăng xe", icon: "⛽" },
      { name: "Taxi, xe ôm", icon: "🚕" },
    ],
  },
  {
    name: "Nhà cửa",
    type: "EXPENSE",
    icon: "🏠",
    color: "#8B5CF6",
    children: [
      { name: "Tiền nhà", icon: "🔑" },
      { name: "Điện nước", icon: "💡" },
      { name: "Internet, điện thoại", icon: "📶" },
    ],
  },
  { name: "Mua sắm", type: "EXPENSE", icon: "🛍️", color: "#EC4899" },
  { name: "Giải trí", type: "EXPENSE", icon: "🎬", color: "#14B8A6" },
  { name: "Sức khỏe", type: "EXPENSE", icon: "💊", color: "#EF4444" },
  { name: "Giáo dục", type: "EXPENSE", icon: "📚", color: "#6366F1" },
  { name: "Hiếu hỉ, quà tặng", type: "EXPENSE", icon: "🎁", color: "#F59E0B" },
  { name: "Chi khác", type: "EXPENSE", icon: "📦", color: "#6B7280" },
  // Income
  { name: "Lương", type: "INCOME", icon: "💰", color: "#22C55E" },
  { name: "Thưởng", type: "INCOME", icon: "🎉", color: "#84CC16" },
  { name: "Thu nhập khác", type: "INCOME", icon: "💵", color: "#10B981" },
];
