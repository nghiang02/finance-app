import {
  categoryInUse,
  describeError,
  serverFieldErrors,
  useDeleteCategory,
} from "@finance/api-client";
import { type Category, type CategoryInUseDetails, replacementCandidates } from "@finance/shared";
import { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";

import { categoryChips } from "@/components/categories/categoryChips";
import { ChipGroup } from "@/components/ChipGroup";
import { PrimaryButton } from "@/components/PrimaryButton";

interface DeleteCategorySectionProps {
  category: Category;
  categories: Category[];
  onDeleted: () => void;
}

/**
 * Deletes without a replacement first. If the server answers 409 CATEGORY_IN_USE, asks
 * where the transactions should go and deletes again with that category.
 */
export function DeleteCategorySection({
  category,
  categories,
  onDeleted,
}: DeleteCategorySectionProps) {
  const deleteCategory = useDeleteCategory();
  const [inUse, setInUse] = useState<CategoryInUseDetails | null>(null);
  const [replacementId, setReplacementId] = useState("");
  const [error, setError] = useState<string | undefined>();

  const childCount = categories.filter((c) => c.parentId === category.id).length;
  const options = categoryChips(replacementCandidates(categories, category));

  function remove(replacement?: string) {
    setError(undefined);
    deleteCategory.mutate(
      { id: category.id, ...(replacement && { replacementId: replacement }) },
      {
        onSuccess: onDeleted,
        onError: (failure) => {
          const details = categoryInUse(failure);
          if (details) {
            setInUse(details);
            return;
          }
          setError(serverFieldErrors(failure).replacementId ?? describeError(failure));
        },
      },
    );
  }

  function confirm() {
    const children = childCount > 0 ? ` và ${String(childCount)} danh mục con` : "";
    Alert.alert("Xóa danh mục?", `Xóa “${category.name}”${children}.`, [
      { text: "Hủy", style: "cancel" },
      { text: "Xóa", style: "destructive", onPress: () => remove() },
    ]);
  }

  if (!inUse) {
    return (
      <View style={styles.section}>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <PrimaryButton
          title="Xóa danh mục"
          variant="danger"
          onPress={confirm}
          loading={deleteCategory.isPending}
        />
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <Text style={styles.warning}>
        Danh mục đang có {inUse.transactionCount} giao dịch. Chọn danh mục để chuyển các giao dịch
        này sang trước khi xóa.
      </Text>
      {options.length > 0 ? (
        <ChipGroup
          options={options}
          value={replacementId}
          onChange={setReplacementId}
          error={error}
        />
      ) : (
        <Text style={styles.error}>
          Không còn danh mục cùng loại để nhận giao dịch. Hãy tạo một danh mục khác trước.
        </Text>
      )}
      <PrimaryButton
        title="Chuyển giao dịch và xóa"
        variant="danger"
        disabled={replacementId === ""}
        onPress={() => remove(replacementId)}
        loading={deleteCategory.isPending}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 12, marginTop: 8 },
  warning: {
    fontSize: 14,
    color: "#92400e",
    backgroundColor: "#fef3c7",
    padding: 12,
    borderRadius: 10,
  },
  error: { fontSize: 13, color: "#EB5757" },
});
