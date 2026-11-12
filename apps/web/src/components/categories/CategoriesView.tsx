"use client";

import { type CategoryFormTarget, useCategories } from "@finance/api-client";
import { buildCategoryTree, type Category, type CategoryType } from "@finance/shared";
import { Pencil, Plus, Shapes, Trash2 } from "lucide-react";
import { useState } from "react";

import { CategoryAvatar } from "@/components/categories/CategoryAvatar";
import { CategoryFormDialog } from "@/components/categories/CategoryFormDialog";
import { DeleteCategoryDialog } from "@/components/categories/DeleteCategoryDialog";
import { QueryStatus } from "@/components/QueryStatus";
import { Button, IconButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Segmented } from "@/components/ui/Segmented";

const TYPE_TABS = [
  { value: "EXPENSE", label: "Khoản chi" },
  { value: "INCOME", label: "Khoản thu" },
] as const;

export function CategoriesView() {
  const categories = useCategories();
  const [type, setType] = useState<CategoryType>("EXPENSE");
  const [formTarget, setFormTarget] = useState<CategoryFormTarget | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);

  const all = categories.data ?? [];
  const tree = buildCategoryTree(all.filter((category) => category.type === type));
  const create = () => setFormTarget({ mode: "create", type, parentId: null });

  return (
    <>
      <PageHeader
        title="Danh mục"
        description="Phân loại khoản thu, khoản chi. Danh mục con giúp báo cáo chi tiết hơn."
        action={
          <Button variant="primary" icon={Plus} onClick={create}>
            Thêm danh mục
          </Button>
        }
      />

      <Segmented
        label="Loại danh mục"
        options={TYPE_TABS}
        value={type}
        onChange={setType}
        className="self-start"
      />

      {!categories.data ? (
        <QueryStatus
          error={categories.error}
          onRetry={() => void categories.refetch()}
          retrying={categories.isFetching}
          rows={5}
        />
      ) : tree.length === 0 ? (
        <EmptyState
          icon={Shapes}
          title="Chưa có danh mục"
          description="Thêm danh mục để phân loại các giao dịch của bạn."
          action={
            <Button variant="primary" icon={Plus} onClick={create}>
              Thêm danh mục
            </Button>
          }
        />
      ) : (
        <ul className="gap-4 md:columns-2">
          {tree.map((parent) => (
            <li
              key={parent.id}
              className="mb-4 flex break-inside-avoid flex-col rounded-3xl bg-surface p-2"
            >
              <CategoryRow
                category={parent}
                detail={
                  parent.children.length > 0
                    ? `${String(parent.children.length)} danh mục con`
                    : undefined
                }
                onEdit={() => setFormTarget({ mode: "edit", category: parent })}
                onDelete={() => setDeleting(parent)}
                onAddChild={() =>
                  setFormTarget({ mode: "create", type: parent.type, parentId: parent.id })
                }
              />
              {parent.children.length > 0 ? (
                <ul className="ml-7 border-l-2 border-line pl-3">
                  {parent.children.map((child) => (
                    <li key={child.id}>
                      <CategoryRow
                        category={child}
                        small
                        onEdit={() => setFormTarget({ mode: "edit", category: child })}
                        onDelete={() => setDeleting(child)}
                      />
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <CategoryFormDialog
        target={formTarget}
        categories={all}
        onClose={() => setFormTarget(null)}
      />
      <DeleteCategoryDialog
        category={deleting}
        categories={all}
        onClose={() => setDeleting(null)}
      />
    </>
  );
}

function CategoryRow({
  category,
  detail,
  small = false,
  onEdit,
  onDelete,
  onAddChild,
}: {
  category: Category;
  detail?: string | undefined;
  small?: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onAddChild?: () => void;
}) {
  return (
    <div className="group flex items-center gap-1 rounded-2xl pr-1 transition hover:bg-field">
      <button
        type="button"
        onClick={onEdit}
        aria-label={`Sửa ${category.name}`}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl px-2 py-2 text-left focus-visible:ring-4 focus-visible:ring-brand-500/25 focus-visible:outline-none"
      >
        <CategoryAvatar icon={category.icon} color={category.color} size={small ? "sm" : "md"} />
        <span className="flex min-w-0 flex-col">
          <span
            className={small ? "line-clamp-2 text-sm font-medium" : "line-clamp-2 font-semibold"}
          >
            {category.name}
          </span>
          {detail ? <span className="text-xs text-muted">{detail}</span> : null}
        </span>
      </button>
      <div className="flex transition sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
        {onAddChild ? (
          <IconButton
            icon={Plus}
            label={`Thêm danh mục con cho ${category.name}`}
            onClick={onAddChild}
          />
        ) : null}
        <IconButton icon={Pencil} label={`Sửa ${category.name}`} onClick={onEdit} />
        <IconButton icon={Trash2} label={`Xóa ${category.name}`} tone="danger" onClick={onDelete} />
      </div>
    </div>
  );
}
