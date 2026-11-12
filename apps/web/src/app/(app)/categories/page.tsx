import type { Metadata } from "next";

import { CategoriesView } from "@/components/categories/CategoriesView";

export const metadata: Metadata = { title: "Danh mục" };

export default function CategoriesPage() {
  return <CategoriesView />;
}
