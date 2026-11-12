import { buildCategoryTree, type Category } from "@finance/shared";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { CategoryAvatar } from "@/components/categories/CategoryAvatar";
import { Icon, ICONS } from "@/components/Icon";
import { useAppTheme } from "@/lib/theme";

interface CategoryListProps {
  categories: readonly Category[];
  value: string | null;
  onSelect: (categoryId: string) => void;
}

/** Categories of one type, each parent followed by its children (indented). */
export function CategoryList({ categories, value, onSelect }: CategoryListProps) {
  const tree = buildCategoryTree(categories);
  if (tree.length === 0) {
    return <Empty text="Chưa có danh mục nào. Thêm danh mục ở tab Tài khoản." />;
  }
  return (
    <View>
      {tree.map((parent) => (
        <View key={parent.id}>
          <Option
            category={parent}
            selected={parent.id === value}
            onPress={() => onSelect(parent.id)}
          />
          {parent.children.map((child) => (
            <Option
              key={child.id}
              category={child}
              child
              selected={child.id === value}
              onPress={() => onSelect(child.id)}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

function Option({
  category,
  child = false,
  selected,
  onPress,
}: {
  category: Category;
  child?: boolean;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useAppTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.option,
        child && styles.child,
        (pressed || selected) && { backgroundColor: selected ? theme.brandSoft : theme.field },
      ]}
    >
      <CategoryAvatar icon={category.icon} color={category.color} size={child ? 34 : 40} />
      <Text
        style={[child ? styles.childName : styles.name, { color: theme.ink }]}
        numberOfLines={1}
      >
        {category.name}
      </Text>
      {selected ? <Icon name={ICONS.check} size={18} color={theme.brand} /> : null}
    </Pressable>
  );
}

export function Empty({ text }: { text: string }) {
  const theme = useAppTheme();
  return <Text style={[styles.empty, { color: theme.muted }]}>{text}</Text>;
}

const styles = StyleSheet.create({
  option: { flexDirection: "row", alignItems: "center", gap: 12, padding: 10, borderRadius: 16 },
  child: { marginLeft: 28 },
  name: { flex: 1, fontSize: 16, fontWeight: "600" },
  childName: { flex: 1, fontSize: 15, fontWeight: "500" },
  empty: { fontSize: 15, textAlign: "center", padding: 24 },
});
