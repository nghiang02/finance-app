import { useSession, useTransactions } from "@finance/api-client";
import {
  currentMonth,
  DEFAULT_TIME_ZONE,
  localDateKey,
  shiftMonth,
  type Transaction,
  type TransactionType,
} from "@finance/shared";
import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { ChipGroup } from "@/components/ChipGroup";
import { Icon, ICONS } from "@/components/Icon";
import { EmptyState, QueryState } from "@/components/QueryState";
import { ScreenHeader } from "@/components/ScreenHeader";
import { TransactionRow } from "@/components/transactions/TransactionRow";
import { useBalanceVisibility } from "@/lib/balance-visibility";
import { formatDayHeading, formatMonthLabel } from "@/lib/format";
import { useLookups } from "@/lib/lookups";
import { useAppTheme } from "@/lib/theme";

type TypeFilter = "ALL" | TransactionType;

const TYPE_FILTERS: readonly { value: TypeFilter; label: string }[] = [
  { value: "ALL", label: "Tất cả" },
  { value: "EXPENSE", label: "Khoản chi" },
  { value: "INCOME", label: "Khoản thu" },
  { value: "TRANSFER", label: "Chuyển ví" },
];

interface DaySection {
  key: string;
  title: string;
  data: Transaction[];
}

/** Items are newest first, so each day's transactions are already next to each other. */
function groupByDay(items: Transaction[], timeZone: string): DaySection[] {
  const sections: DaySection[] = [];
  for (const item of items) {
    const key = localDateKey(new Date(item.occurredAt), timeZone);
    const last = sections.at(-1);
    if (last?.key === key) {
      last.data.push(item);
    } else {
      sections.push({ key, title: formatDayHeading(key, timeZone), data: [item] });
    }
  }
  return sections;
}

export default function TransactionsScreen() {
  const theme = useAppTheme();
  const { user } = useSession();
  const timeZone = user?.timezone ?? DEFAULT_TIME_ZONE;
  const [month, setMonth] = useState(() => currentMonth(timeZone));
  const [type, setType] = useState<TypeFilter>("ALL");
  const { hidden } = useBalanceVisibility();
  const lookups = useLookups();
  const transactions = useTransactions({ month, ...(type !== "ALL" && { type }) });

  const items = transactions.data?.pages.flatMap((page) => page.items) ?? [];
  const sections = groupByDay(items, timeZone);
  const isCurrentMonth = month === currentMonth(timeZone);

  const header = (
    <View style={styles.headerBlock}>
      <ScreenHeader title="Giao dịch" />
      <View style={styles.controls}>
        <View style={[styles.monthBar, { backgroundColor: theme.surface }]}>
          <MonthButton icon="back" onPress={() => setMonth(shiftMonth(month, -1))} />
          <Text style={[styles.month, { color: theme.ink }]}>{formatMonthLabel(month)}</Text>
          <MonthButton
            icon="forward"
            disabled={isCurrentMonth}
            onPress={() => setMonth(shiftMonth(month, 1))}
          />
        </View>
        <ChipGroup options={TYPE_FILTERS} value={type} onChange={setType} />
      </View>
    </View>
  );

  if (!transactions.data) {
    return (
      <View style={[styles.flex, { backgroundColor: theme.canvas }]}>
        {header}
        <QueryState
          error={transactions.error}
          onRetry={() => void transactions.refetch()}
          retrying={transactions.isFetching}
        />
      </View>
    );
  }

  return (
    <SectionList
      style={{ backgroundColor: theme.canvas }}
      contentContainerStyle={styles.content}
      sections={sections}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={header}
      stickySectionHeadersEnabled={false}
      renderSectionHeader={({ section }) => (
        <Text style={[styles.day, { color: theme.muted }]}>{section.title}</Text>
      )}
      renderItem={({ item, index }) => (
        <View
          style={[styles.rowWrap, { backgroundColor: theme.surface }, index === 0 && styles.first]}
        >
          <TransactionRow
            transaction={item}
            {...lookups}
            hidden={hidden}
            separated={index > 0}
            onPress={() => router.push({ pathname: "/transactions/[id]", params: { id: item.id } })}
          />
        </View>
      )}
      renderSectionFooter={() => (
        <View style={[styles.sectionEnd, { backgroundColor: theme.surface }]} />
      )}
      ListEmptyComponent={
        <EmptyState
          icon={ICONS.transactions}
          title="Chưa có giao dịch"
          message="Bấm nút + ở giữa thanh dưới để ghi khoản chi đầu tiên của tháng."
        />
      }
      ListFooterComponent={
        transactions.isFetchingNextPage ? <ActivityIndicator style={styles.more} /> : undefined
      }
      onEndReached={() => {
        if (transactions.hasNextPage && !transactions.isFetchingNextPage) {
          void transactions.fetchNextPage();
        }
      }}
      onEndReachedThreshold={0.4}
      refreshControl={
        <RefreshControl
          refreshing={transactions.isRefetching && !transactions.isFetchingNextPage}
          onRefresh={() => void transactions.refetch()}
        />
      }
    />
  );
}

function MonthButton({
  icon,
  onPress,
  disabled = false,
}: {
  icon: "back" | "forward";
  onPress: () => void;
  disabled?: boolean;
}) {
  const theme = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={icon === "back" ? "Tháng trước" : "Tháng sau"}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={8}
      style={[styles.monthButton, disabled && styles.disabled]}
    >
      <Icon
        name={icon === "back" ? ICONS.chevronLeft : ICONS.chevronRight}
        size={16}
        color={theme.ink}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingBottom: 32 },
  headerBlock: { gap: 4 },
  controls: { gap: 12, paddingHorizontal: 16, paddingBottom: 4 },
  monthBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 999,
    padding: 6,
  },
  monthButton: {
    width: 36,
    height: 36,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  disabled: { opacity: 0.3 },
  month: { fontSize: 16, fontWeight: "700" },
  day: { fontSize: 13, fontWeight: "700", marginTop: 18, marginBottom: 8, marginHorizontal: 20 },
  rowWrap: { marginHorizontal: 16 },
  first: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 4 },
  sectionEnd: {
    height: 8,
    marginHorizontal: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  more: { marginVertical: 16 },
});
