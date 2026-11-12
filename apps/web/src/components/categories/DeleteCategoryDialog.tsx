"use client";

import {
  categoryInUse,
  type FieldErrors,
  serverFieldErrors,
  useDeleteCategory,
} from "@finance/api-client";
import {
  type Category,
  type CategoryInUseDetails,
  flattenCategoryTree,
  replacementCandidates,
} from "@finance/shared";
import { useState } from "react";

import { CategoryAvatar, categoryOptionLabel } from "@/components/categories/CategoryAvatar";
import { Dialog } from "@/components/Dialog";
import { FormError } from "@/components/FormError";
import { SelectField } from "@/components/SelectField";
import { Button } from "@/components/ui/Button";

interface DeleteCategoryDialogProps {
  category: Category | null;
  categories: Category[];
  onClose: () => void;
}

export function DeleteCategoryDialog({ category, categories, onClose }: DeleteCategoryDialogProps) {
  return (
    <Dialog open={category !== null} onClose={onClose} title="Xóa danh mục?">
      {category ? (
        <DeleteCategoryForm category={category} categories={categories} onDone={onClose} />
      ) : null}
    </Dialog>
  );
}

/**
 * First attempt deletes without a replacement. If the server answers 409 CATEGORY_IN_USE,
 * the form asks where the transactions should go and deletes again with that category.
 * (Asking up front would need an extra "count transactions" request for every delete.)
 */
function DeleteCategoryForm({
  category,
  categories,
  onDone,
}: {
  category: Category;
  categories: Category[];
  onDone: () => void;
}) {
  const deleteCategory = useDeleteCategory();
  const [inUse, setInUse] = useState<CategoryInUseDetails | null>(null);
  const [replacementId, setReplacementId] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const childCount = categories.filter((c) => c.parentId === category.id).length;
  const replacementOptions = [
    { value: "", label: "Chọn danh mục…" },
    ...flattenCategoryTree(replacementCandidates(categories, category)).map(
      ({ category: option, depth }) => ({
        value: option.id,
        label: categoryOptionLabel(option, depth),
      }),
    ),
  ];

  function handleDelete() {
    if (inUse && replacementId === "") {
      setFieldErrors({ replacementId: "Chọn danh mục nhận các giao dịch" });
      return;
    }
    setFieldErrors({});
    deleteCategory.mutate(
      { id: category.id, ...(inUse && { replacementId }) },
      {
        onSuccess: onDone,
        onError: (error) => {
          const details = categoryInUse(error);
          if (details) {
            setInUse(details);
          } else {
            setFieldErrors(serverFieldErrors(error));
          }
        },
      },
    );
  }

  const showGenericError =
    deleteCategory.isError &&
    !categoryInUse(deleteCategory.error) &&
    Object.keys(serverFieldErrors(deleteCategory.error)).length === 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 rounded-2xl bg-field p-3">
        <CategoryAvatar icon={category.icon} color={category.color} />
        <p className="text-sm text-muted">
          Xóa <strong className="text-ink">{category.name}</strong>
          {childCount > 0 ? ` và ${String(childCount)} danh mục con` : ""}?
        </p>
      </div>

      {inUse ? (
        <>
          <p className="rounded-2xl bg-amber-500/10 px-4 py-3 text-sm leading-relaxed text-amber-700 dark:text-amber-300">
            Danh mục đang có {inUse.transactionCount} giao dịch. Chọn danh mục để chuyển các giao
            dịch này sang, báo cáo các tháng trước sẽ giữ nguyên số tiền.
          </p>
          {replacementOptions.length > 1 ? (
            <SelectField
              id="replacement"
              label="Chuyển giao dịch sang"
              value={replacementId}
              onChange={(event) => setReplacementId(event.target.value)}
              options={replacementOptions}
              error={fieldErrors.replacementId}
            />
          ) : (
            <p className="text-sm text-expense">
              Không còn danh mục cùng loại để nhận giao dịch. Hãy tạo một danh mục khác trước.
            </p>
          )}
        </>
      ) : null}

      {showGenericError ? <FormError error={deleteCategory.error} /> : null}

      <div className="flex justify-end gap-2 pt-1">
        <Button onClick={onDone}>Hủy</Button>
        <Button
          variant="danger"
          onClick={handleDelete}
          disabled={deleteCategory.isPending || (inUse !== null && replacementOptions.length <= 1)}
        >
          {deleteCategory.isPending ? "Đang xóa…" : inUse ? "Chuyển và xóa" : "Xóa"}
        </Button>
      </div>
    </div>
  );
}
