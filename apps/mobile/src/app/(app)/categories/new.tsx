import { useCategories } from "@finance/api-client";
import { categoryTypeSchema } from "@finance/shared";
import { router, useLocalSearchParams } from "expo-router";

import { CategoryForm } from "@/components/categories/CategoryForm";
import { QueryState } from "@/components/QueryState";

export default function NewCategoryScreen() {
  const params = useLocalSearchParams<{ type?: string; parentId?: string }>();
  const categories = useCategories();
  // URL params are untrusted strings: fall back to "EXPENSE" if `type` is missing or wrong.
  const type = categoryTypeSchema.catch("EXPENSE").parse(params.type);

  if (!categories.data) {
    return (
      <QueryState
        error={categories.error}
        onRetry={() => void categories.refetch()}
        retrying={categories.isFetching}
      />
    );
  }
  return (
    <CategoryForm
      target={{ mode: "create", type, parentId: params.parentId ?? null }}
      categories={categories.data}
      onDone={() => router.back()}
    />
  );
}
