import { useCategories } from "@finance/api-client";
import { router, useLocalSearchParams } from "expo-router";

import { CategoryForm } from "@/components/categories/CategoryForm";
import { DeleteCategorySection } from "@/components/categories/DeleteCategorySection";
import { EmptyState, QueryState } from "@/components/QueryState";

export default function EditCategoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const categories = useCategories();

  if (!categories.data) {
    return (
      <QueryState
        error={categories.error}
        onRetry={() => void categories.refetch()}
        retrying={categories.isFetching}
      />
    );
  }
  const category = categories.data.find((item) => item.id === id);
  if (!category) {
    return <EmptyState message="Không tìm thấy danh mục." />;
  }

  return (
    <CategoryForm
      target={{ mode: "edit", category }}
      categories={categories.data}
      onDone={() => router.back()}
      footer={
        <DeleteCategorySection
          category={category}
          categories={categories.data}
          onDeleted={() => router.back()}
        />
      }
    />
  );
}
