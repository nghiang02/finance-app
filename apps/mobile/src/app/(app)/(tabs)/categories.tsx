import { useCategories } from "@finance/api-client";
import { buildCategoryTree, type CategoryType } from "@finance/shared";
import { router } from "expo-router";
import { useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";

import { Card } from "@/components/Card";
import { CategoryAvatar } from "@/components/categories/CategoryAvatar";
import { ICONS } from "@/components/Icon";
import { ListRow } from "@/components/ListRow";
import { EmptyState, QueryState } from "@/components/QueryState";
import { RoundButton } from "@/components/RoundButton";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Segmented } from "@/components/Segmented";
import { useAppTheme } from "@/lib/theme";

const TYPE_TABS = [
  { value: "EXPENSE", label: "Khoản chi" },
  { value: "INCOME", label: "Khoản thu" },
] as const;

export default function CategoriesScreen() {
  const theme = useAppTheme();
  const categories = useCategories();
  const [type, setType] = useState<CategoryType>("EXPENSE");

  const tree = buildCategoryTree((categories.data ?? []).filter((c) => c.type === type));
  const addCategory = (parentId?: string) =>
    router.push({ pathname: "/categories/new", params: { type, ...(parentId && { parentId }) } });
  const edit = (id: string) => router.push({ pathname: "/categories/[id]", params: { id } });

  return (
    <ScrollView
      style={{ backgroundColor: theme.canvas }}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={categories.isRefetching}
          onRefresh={() => void categories.refetch()}
        />
      }
    >
      <ScreenHeader
        title="Danh mục"
        action={
          <RoundButton icon={ICONS.plus} label="Thêm danh mục" onPress={() => addCategory()} />
        }
      />
      <View style={styles.body}>
        <Segmented options={TYPE_TABS} value={type} onChange={setType} />

        {!categories.data ? (
          <QueryState
            error={categories.error}
            onRetry={() => void categories.refetch()}
            retrying={categories.isFetching}
          />
        ) : tree.length === 0 ? (
          <EmptyState
            icon={ICONS.categories}
            title="Chưa có danh mục"
            message="Bấm “+” để thêm danh mục phân loại giao dịch."
          />
        ) : (
          tree.map((parent) => (
            <Card key={parent.id} padded={false}>
              <ListRow
                leading={<CategoryAvatar icon={parent.icon} color={parent.color} />}
                title={parent.name}
                subtitle={
                  parent.children.length > 0
                    ? `${String(parent.children.length)} danh mục con`
                    : undefined
                }
                accessibilityLabel={`Sửa ${parent.name}`}
                onPress={() => edit(parent.id)}
                chevron={false}
                trailing={
                  <RoundButton
                    icon={ICONS.plus}
                    label={`Thêm danh mục con cho ${parent.name}`}
                    variant="soft"
                    size={32}
                    onPress={() => addCategory(parent.id)}
                  />
                }
              />
              {parent.children.map((child) => (
                <ListRow
                  key={child.id}
                  separated
                  indent={28}
                  leading={<CategoryAvatar icon={child.icon} color={child.color} size={36} />}
                  title={child.name}
                  accessibilityLabel={`Sửa ${child.name}`}
                  onPress={() => edit(child.id)}
                />
              ))}
            </Card>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 32 },
  body: { gap: 12, paddingHorizontal: 16 },
});
