"use client";

import {
  categoryFormValues,
  type CategoryFormTarget,
  type CategoryFormValues,
  type FieldErrors,
  serverFieldErrors,
  toCreateCategoryRequest,
  toUpdateCategoryRequest,
  useCreateCategory,
  useUpdateCategory,
} from "@finance/api-client";
import {
  type Category,
  CATEGORY_COLORS,
  CATEGORY_ICON_SUGGESTIONS,
  type CategoryType,
  parentCandidates,
} from "@finance/shared";
import { Check } from "lucide-react";
import { type FormEvent, useState } from "react";

import { CategoryAvatar, categoryOptionLabel } from "@/components/categories/CategoryAvatar";
import { Dialog } from "@/components/Dialog";
import { FormError } from "@/components/FormError";
import { SelectField } from "@/components/SelectField";
import { TextField } from "@/components/TextField";
import { Button } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/Segmented";
import { cx } from "@/lib/cx";

const TYPE_TABS = [
  { value: "EXPENSE", label: "Khoản chi" },
  { value: "INCOME", label: "Khoản thu" },
] as const;

interface CategoryFormDialogProps {
  target: CategoryFormTarget | null;
  categories: Category[];
  onClose: () => void;
}

export function CategoryFormDialog({ target, categories, onClose }: CategoryFormDialogProps) {
  return (
    <Dialog
      open={target !== null}
      onClose={onClose}
      title={target?.mode === "edit" ? "Sửa danh mục" : "Thêm danh mục"}
    >
      {target ? <CategoryForm target={target} categories={categories} onDone={onClose} /> : null}
    </Dialog>
  );
}

function CategoryForm({
  target,
  categories,
  onDone,
}: {
  target: CategoryFormTarget;
  categories: Category[];
  onDone: () => void;
}) {
  const editing = target.mode === "edit" ? target.category : undefined;
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const mutation = editing ? updateCategory : createCategory;

  const [values, setValues] = useState<CategoryFormValues>(() => categoryFormValues(target));
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const set = <K extends keyof CategoryFormValues>(key: K, value: CategoryFormValues[K]) =>
    setValues((previous) => ({ ...previous, [key]: value }));

  const parents = parentCandidates(categories, values.type, editing);
  const parent = categories.find((category) => category.id === values.parentId);
  const parentOptions = [
    { value: "", label: "Không có (danh mục gốc)" },
    ...parents.map((option) => ({ value: option.id, label: categoryOptionLabel(option, 0) })),
  ];
  // What the saved category will look like: a new child without a chosen color takes its parent's.
  const previewColor = values.color === undefined ? (parent?.color ?? null) : values.color;

  function changeType(type: CategoryType) {
    // A parent of the other type is no longer valid.
    setValues((previous) => ({ ...previous, type, parentId: null }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const onError = (error: unknown) => setFieldErrors(serverFieldErrors(error));

    if (editing) {
      const result = toUpdateCategoryRequest(values);
      setFieldErrors(result.success ? {} : result.errors);
      if (result.success) {
        updateCategory.mutate(
          { id: editing.id, changes: result.data },
          { onSuccess: onDone, onError },
        );
      }
    } else {
      const result = toCreateCategoryRequest(values);
      setFieldErrors(result.success ? {} : result.errors);
      if (result.success) {
        createCategory.mutate(result.data, { onSuccess: onDone, onError });
      }
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      <div className="flex flex-col items-center gap-2 rounded-3xl bg-field py-5">
        <CategoryAvatar icon={values.icon.trim() || null} color={previewColor} size="lg" />
        <span className="font-semibold">{values.name.trim() || "Tên danh mục"}</span>
        <span className="text-xs text-muted">
          {values.type === "EXPENSE" ? "Khoản chi" : "Khoản thu"}
          {parent ? ` · thuộc ${parent.name}` : ""}
        </span>
      </div>

      {editing ? null : (
        <Segmented
          label="Loại danh mục"
          options={TYPE_TABS}
          value={values.type}
          onChange={changeType}
          className="w-full bg-field shadow-none"
        />
      )}

      <TextField
        id="category-name"
        label="Tên danh mục"
        value={values.name}
        onChange={(event) => set("name", event.target.value)}
        error={fieldErrors.name}
        placeholder="Ví dụ: Trà sữa"
        autoFocus
      />

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">Icon</legend>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORY_ICON_SUGGESTIONS.map((icon) => (
            <button
              key={icon}
              type="button"
              aria-pressed={values.icon === icon}
              onClick={() => set("icon", values.icon === icon ? "" : icon)}
              className="flex size-10 items-center justify-center rounded-xl text-xl transition hover:bg-field aria-pressed:bg-brand-50 aria-pressed:ring-2 aria-pressed:ring-brand-500 dark:aria-pressed:bg-brand-900/40"
            >
              {icon}
            </button>
          ))}
        </div>
        <TextField
          id="category-icon"
          label="Hoặc nhập emoji khác"
          value={values.icon}
          onChange={(event) => set("icon", event.target.value)}
          error={fieldErrors.icon}
          placeholder="🍜"
          className="w-28 text-center text-lg"
        />
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">Màu</legend>
        <div className="flex flex-wrap gap-2.5">
          {CATEGORY_COLORS.map((color) => (
            <label key={color} className="cursor-pointer">
              <input
                type="radio"
                name="category-color"
                value={color}
                checked={values.color === color}
                onChange={() => set("color", color)}
                aria-label={color}
                className="peer sr-only"
              />
              <span
                className={cx(
                  "flex size-8 items-center justify-center rounded-full text-white ring-offset-2 ring-offset-surface transition peer-focus-visible:ring-2 peer-focus-visible:ring-muted",
                  values.color === color && "ring-2 ring-ink",
                )}
                style={{ backgroundColor: color }}
              >
                {values.color === color ? (
                  <Check aria-hidden className="size-4" strokeWidth={3} />
                ) : null}
              </span>
            </label>
          ))}
        </div>
        {values.color === undefined && parent ? (
          <p className="text-xs text-muted">Chưa chọn: dùng màu của “{parent.name}”.</p>
        ) : null}
      </fieldset>

      {editing && parents.length === 0 && editing.parentId === null ? (
        <p className="rounded-2xl bg-field px-4 py-3 text-sm text-muted">
          Danh mục này đang có danh mục con nên luôn là danh mục gốc.
        </p>
      ) : (
        <SelectField
          id="category-parent"
          label="Thuộc danh mục"
          value={values.parentId ?? ""}
          onChange={(event) =>
            set("parentId", event.target.value === "" ? null : event.target.value)
          }
          options={parentOptions}
          error={fieldErrors.parentId}
        />
      )}

      {mutation.isError && Object.keys(serverFieldErrors(mutation.error)).length === 0 ? (
        <FormError error={mutation.error} />
      ) : null}

      <Button type="submit" variant="primary" size="lg" disabled={mutation.isPending}>
        {mutation.isPending ? "Đang lưu…" : editing ? "Lưu thay đổi" : "Tạo danh mục"}
      </Button>
    </form>
  );
}
