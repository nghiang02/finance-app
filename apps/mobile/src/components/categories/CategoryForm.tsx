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
  CATEGORY_ICON_SUGGESTIONS,
  type CategoryType,
  parentCandidates,
} from "@finance/shared";
import { type ReactNode, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { CategoryAvatar } from "@/components/categories/CategoryAvatar";
import { categoryText } from "@/components/categories/categoryChips";
import { ChipGroup } from "@/components/ChipGroup";
import { ColorSwatches } from "@/components/ColorSwatches";
import { FormError } from "@/components/FormError";
import { FormScreen } from "@/components/FormScreen";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Segmented } from "@/components/Segmented";
import { TextField } from "@/components/TextField";
import { useAppTheme } from "@/lib/theme";

const TYPE_TABS = [
  { value: "EXPENSE", label: "Khoản chi" },
  { value: "INCOME", label: "Khoản thu" },
] as const;

/** Chip value for "no parent": chips need a string. */
const ROOT = "";

interface CategoryFormProps {
  target: CategoryFormTarget;
  categories: Category[];
  onDone: () => void;
  footer?: ReactNode;
}

export function CategoryForm({ target, categories, onDone, footer }: CategoryFormProps) {
  const theme = useAppTheme();
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
    { value: ROOT, label: "Không có" },
    ...parents.map((option) => ({ value: option.id, label: categoryText(option) })),
  ];
  // What the saved category will look like: a new child without a chosen color takes its parent's.
  const previewColor = values.color === undefined ? (parent?.color ?? null) : values.color;

  function changeType(type: CategoryType) {
    // A parent of the other type is no longer valid.
    setValues((previous) => ({ ...previous, type, parentId: null }));
  }

  function handleSubmit() {
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
    <FormScreen>
      <View style={[styles.preview, { backgroundColor: theme.field }]}>
        <CategoryAvatar icon={values.icon.trim() || null} color={previewColor} size={64} />
        <Text style={[styles.previewName, { color: theme.ink }]}>
          {values.name.trim() || "Tên danh mục"}
        </Text>
        <Text style={[styles.previewMeta, { color: theme.muted }]}>
          {values.type === "EXPENSE" ? "Khoản chi" : "Khoản thu"}
          {parent ? ` · thuộc ${parent.name}` : ""}
        </Text>
      </View>

      {editing ? null : (
        <Segmented
          options={TYPE_TABS}
          value={values.type}
          onChange={changeType}
          background="field"
        />
      )}

      <TextField
        label="Tên danh mục"
        value={values.name}
        onChangeText={(text) => set("name", text)}
        error={fieldErrors.name}
        placeholder="Ví dụ: Trà sữa"
        autoFocus={!editing}
      />

      <View style={styles.field}>
        <Text style={[styles.label, { color: theme.ink }]}>Icon</Text>
        <View style={styles.emojis}>
          {CATEGORY_ICON_SUGGESTIONS.map((icon) => {
            const selected = values.icon === icon;
            return (
              <Pressable
                key={icon}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => set("icon", selected ? "" : icon)}
                style={[
                  styles.emoji,
                  {
                    backgroundColor: selected ? theme.brandSoft : theme.field,
                    borderColor: selected ? theme.brand : "transparent",
                  },
                ]}
              >
                <Text style={styles.emojiText}>{icon}</Text>
              </Pressable>
            );
          })}
        </View>
        <TextField
          label="Hoặc nhập emoji khác"
          value={values.icon}
          onChangeText={(text) => set("icon", text)}
          error={fieldErrors.icon}
          placeholder="🍜"
          style={styles.iconInput}
        />
      </View>

      <ColorSwatches
        value={values.color}
        onChange={(color) => set("color", color)}
        hint={
          values.color === undefined && parent
            ? `Chưa chọn: dùng màu của “${parent.name}”.`
            : undefined
        }
      />

      {editing && parents.length === 0 && editing.parentId === null ? (
        <Text style={[styles.note, { color: theme.muted, backgroundColor: theme.field }]}>
          Danh mục đang có danh mục con nên luôn là danh mục gốc.
        </Text>
      ) : (
        <ChipGroup
          label="Thuộc danh mục"
          options={parentOptions}
          value={values.parentId ?? ROOT}
          onChange={(id) => set("parentId", id === ROOT ? null : id)}
          error={fieldErrors.parentId}
        />
      )}

      <FormError error={mutation.error} />
      <PrimaryButton
        title={editing ? "Lưu thay đổi" : "Tạo danh mục"}
        onPress={handleSubmit}
        loading={mutation.isPending}
      />
      {footer}
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  preview: { alignItems: "center", gap: 6, borderRadius: 24, paddingVertical: 20 },
  previewName: { fontSize: 17, fontWeight: "700" },
  previewMeta: { fontSize: 13 },
  field: { gap: 8 },
  label: { fontSize: 14, fontWeight: "600" },
  emojis: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  emoji: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  emojiText: { fontSize: 22 },
  iconInput: { fontSize: 20 },
  note: { fontSize: 14, borderRadius: 16, padding: 14, overflow: "hidden" },
});
