import {
  type FieldErrors,
  serverFieldErrors,
  toCreateTransactionRequest,
  toUpdateTransactionRequest,
  transactionFormValues,
  type TransactionFormTarget,
  type TransactionFormValues,
  useCategories,
  useCreateTransaction,
  useSession,
  useUpdateTransaction,
  useWallets,
} from "@finance/api-client";
import { DEFAULT_TIME_ZONE, normalizeAmountInput, type TransactionType } from "@finance/shared";
import { type ReactNode, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { CategoryAvatar } from "@/components/categories/CategoryAvatar";
import { FormError } from "@/components/FormError";
import { FormScreen } from "@/components/FormScreen";
import { Icon, ICONS } from "@/components/Icon";
import { PickerSheet } from "@/components/PickerSheet";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Segmented } from "@/components/Segmented";
import { TextField } from "@/components/TextField";
import { CategoryList } from "@/components/transactions/CategoryList";
import { DateTimeField } from "@/components/transactions/DateTimeField";
import { FieldRow } from "@/components/transactions/FieldRow";
import { WalletList } from "@/components/transactions/WalletList";
import { WalletIcon } from "@/components/wallets/WalletIcon";
import { useBalanceVisibility } from "@/lib/balance-visibility";
import { rememberWallet } from "@/lib/last-wallet";
import { useAppTheme } from "@/lib/theme";

const TYPE_TABS = [
  { value: "EXPENSE", label: "Khoản chi" },
  { value: "INCOME", label: "Khoản thu" },
  { value: "TRANSFER", label: "Chuyển ví" },
] as const;

type Sheet = "category" | "wallet" | "toWallet" | null;

interface TransactionFormProps {
  target: TransactionFormTarget;
  onDone: () => void;
  footer?: ReactNode;
}

/** Large amounts get a smaller font so they never overflow the screen. */
function amountFontSize(amount: string): number {
  if (amount.length > 13) return 30;
  if (amount.length > 9) return 36;
  return 44;
}

/**
 * Quick entry: amount first (keyboard already open), then compact rows that open a picker
 * (category, wallet, date and time). Wallet and date default to the usual answer
 * (last wallet, now), so a typical expense is amount → category → "Lưu".
 */
export function TransactionForm({ target, onDone, footer }: TransactionFormProps) {
  const theme = useAppTheme();
  const { user } = useSession();
  const timeZone = user?.timezone ?? DEFAULT_TIME_ZONE;
  const { hidden } = useBalanceVisibility();
  const wallets = useWallets();
  const categories = useCategories();
  const createTransaction = useCreateTransaction();
  const updateTransaction = useUpdateTransaction();
  const editing = target.mode === "edit" ? target.transaction : undefined;
  const mutation = editing ? updateTransaction : createTransaction;

  const [values, setValues] = useState<TransactionFormValues>(() => transactionFormValues(target));
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [sheet, setSheet] = useState<Sheet>(null);
  const set = <K extends keyof TransactionFormValues>(key: K, value: TransactionFormValues[K]) => {
    setValues((previous) => ({ ...previous, [key]: value }));
    setFieldErrors((previous) => ({ ...previous, [key]: undefined }));
  };

  // New money can only go to wallets that are not archived; an edited transaction keeps its own.
  const selectableWallets = (wallets.data ?? []).filter(
    (w) => !w.archived || w.id === editing?.walletId || w.id === editing?.toWalletId,
  );
  const typeCategories = (categories.data ?? []).filter((c) => c.type === values.type);
  const category = (categories.data ?? []).find((c) => c.id === values.categoryId);
  const wallet = (wallets.data ?? []).find((w) => w.id === values.walletId);
  const toWallet = (wallets.data ?? []).find((w) => w.id === values.toWalletId);

  function changeType(type: TransactionType) {
    // A category of the other type is no longer valid.
    setValues((previous) => ({ ...previous, type, categoryId: null }));
    setFieldErrors({});
  }

  function handleSubmit() {
    const onError = (error: unknown) => setFieldErrors(serverFieldErrors(error));
    const onSuccess = () => {
      if (values.walletId) {
        rememberWallet(values.walletId);
      }
      onDone();
    };
    if (editing) {
      const result = toUpdateTransactionRequest(values);
      setFieldErrors(result.success ? {} : result.errors);
      if (result.success) {
        updateTransaction.mutate({ id: editing.id, changes: result.data }, { onSuccess, onError });
      }
    } else {
      const result = toCreateTransactionRequest(values);
      setFieldErrors(result.success ? {} : result.errors);
      if (result.success) {
        createTransaction.mutate(result.data, { onSuccess, onError });
      }
    }
  }

  const amountColor =
    values.type === "EXPENSE" ? theme.expense : values.type === "INCOME" ? theme.income : theme.ink;

  return (
    <FormScreen>
      <Segmented options={TYPE_TABS} value={values.type} onChange={changeType} background="field" />

      <View style={styles.amountBox}>
        {/* Full width with the currency on the side: an auto-sized input gets clipped on Android. */}
        <View style={styles.amountRow}>
          <TextInput
            accessibilityLabel="Số tiền"
            value={values.amount}
            onChangeText={(text) => set("amount", normalizeAmountInput(text))}
            placeholder="0"
            placeholderTextColor={theme.line}
            keyboardType="number-pad"
            autoFocus={!editing}
            style={[styles.amount, { color: amountColor, fontSize: amountFontSize(values.amount) }]}
          />
          <Text style={[styles.currency, { color: amountColor }]}>₫</Text>
        </View>
        {/* Number pads have no "000" key; VND amounts almost always end with it. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Thêm ba số 0"
          onPress={() => set("amount", normalizeAmountInput(`${values.amount}000`))}
          style={[styles.zeros, { backgroundColor: theme.field }]}
        >
          <Text style={[styles.zerosText, { color: theme.ink }]}>000</Text>
        </Pressable>
        {fieldErrors.amount ? (
          <Text style={[styles.error, { color: theme.expense }]}>{fieldErrors.amount}</Text>
        ) : null}
      </View>

      <View style={[styles.group, { borderColor: theme.line }]}>
        {values.type === "TRANSFER" ? (
          <>
            <FieldRow
              label="Từ ví"
              value={wallet?.name ?? null}
              placeholder="Chọn ví chuyển"
              leading={wallet ? <WalletIcon type={wallet.type} size={36} /> : <EmptyIcon />}
              onPress={() => setSheet("wallet")}
              error={fieldErrors.walletId}
            />
            <FieldRow
              separated
              label="Đến ví"
              value={toWallet?.name ?? null}
              placeholder="Chọn ví nhận"
              leading={toWallet ? <WalletIcon type={toWallet.type} size={36} /> : <EmptyIcon />}
              onPress={() => setSheet("toWallet")}
              error={fieldErrors.toWalletId}
            />
          </>
        ) : (
          <>
            <FieldRow
              label="Danh mục"
              value={category?.name ?? null}
              placeholder="Chọn danh mục"
              leading={
                category ? (
                  <CategoryAvatar icon={category.icon} color={category.color} size={36} />
                ) : (
                  <EmptyIcon />
                )
              }
              onPress={() => setSheet("category")}
              error={fieldErrors.categoryId}
            />
            <FieldRow
              separated
              label="Ví"
              value={wallet?.name ?? null}
              placeholder="Chọn ví"
              leading={wallet ? <WalletIcon type={wallet.type} size={36} /> : <EmptyIcon />}
              onPress={() => setSheet("wallet")}
              error={fieldErrors.walletId}
            />
          </>
        )}
        <DateTimeField
          separated
          value={values.occurredAt}
          onChange={(iso) => set("occurredAt", iso)}
          timeZone={timeZone}
          error={fieldErrors.occurredAt}
        />
      </View>

      <TextField
        label="Ghi chú"
        value={values.note}
        onChangeText={(text) => set("note", text)}
        placeholder="Không bắt buộc, ví dụ: Phở bò"
        error={fieldErrors.note}
        returnKeyType="done"
      />

      <FormError error={mutation.error} />
      <PrimaryButton
        title={editing ? "Lưu thay đổi" : "Lưu"}
        onPress={handleSubmit}
        loading={mutation.isPending}
      />
      {footer}

      <PickerSheet
        visible={sheet === "category"}
        title={values.type === "INCOME" ? "Danh mục khoản thu" : "Danh mục khoản chi"}
        onClose={() => setSheet(null)}
      >
        <CategoryList
          categories={typeCategories}
          value={values.categoryId}
          onSelect={(id) => {
            set("categoryId", id);
            setSheet(null);
          }}
        />
      </PickerSheet>
      <PickerSheet
        visible={sheet === "wallet" || sheet === "toWallet"}
        title={sheet === "toWallet" ? "Đến ví" : values.type === "TRANSFER" ? "Từ ví" : "Ví"}
        onClose={() => setSheet(null)}
      >
        <WalletList
          wallets={
            sheet === "toWallet"
              ? selectableWallets.filter((w) => w.id !== values.walletId)
              : selectableWallets
          }
          value={sheet === "toWallet" ? values.toWalletId : values.walletId}
          hidden={hidden}
          onSelect={(id) => {
            if (sheet === "toWallet") {
              set("toWalletId", id);
            } else {
              set("walletId", id);
              if (id === values.toWalletId) {
                set("toWalletId", null);
              }
            }
            setSheet(null);
          }}
        />
      </PickerSheet>
    </FormScreen>
  );
}

function EmptyIcon() {
  const theme = useAppTheme();
  return (
    <View style={[styles.emptyIcon, { borderColor: theme.line }]}>
      <Icon name={ICONS.plus} size={16} color={theme.muted} />
    </View>
  );
}

const styles = StyleSheet.create({
  amountBox: { alignItems: "center", gap: 10, paddingVertical: 4 },
  amountRow: { flexDirection: "row", alignItems: "center", alignSelf: "stretch" },
  amount: {
    flex: 1,
    fontWeight: "800",
    letterSpacing: -1,
    textAlign: "center",
    // Same space on the left as the currency takes on the right keeps the number centered.
    paddingLeft: 28,
    paddingVertical: 4,
    fontVariant: ["tabular-nums"],
  },
  currency: { width: 28, fontSize: 24, fontWeight: "700" },
  zeros: { borderRadius: 999, paddingHorizontal: 18, paddingVertical: 8 },
  zerosText: { fontSize: 15, fontWeight: "700", letterSpacing: 1 },
  error: { fontSize: 13 },
  group: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 20, overflow: "hidden" },
  emptyIcon: {
    width: 36,
    height: 36,
    borderRadius: 999,
    borderWidth: 1.5,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
});
