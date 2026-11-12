import {
  type FieldErrors,
  serverFieldErrors,
  toCreateWalletRequest,
  toUpdateWalletRequest,
  useCreateWallet,
  useUpdateWallet,
  walletFormValues,
  type WalletFormValues,
} from "@finance/api-client";
import { type Wallet, WALLET_TYPE_LABELS, WALLET_TYPES } from "@finance/shared";
import { type ReactNode, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { FormError } from "@/components/FormError";
import { FormScreen } from "@/components/FormScreen";
import { PrimaryButton } from "@/components/PrimaryButton";
import { SwitchRow } from "@/components/SwitchRow";
import { TextField } from "@/components/TextField";
import { WalletIcon } from "@/components/wallets/WalletIcon";
import { useAppTheme } from "@/lib/theme";

interface WalletFormProps {
  /** Edit this wallet; create a new one when undefined. */
  wallet?: Wallet | undefined;
  onDone: () => void;
  /** Extra content under the save button, e.g. the delete button. */
  footer?: ReactNode;
}

export function WalletForm({ wallet, onDone, footer }: WalletFormProps) {
  const theme = useAppTheme();
  const createWallet = useCreateWallet();
  const updateWallet = useUpdateWallet();
  const mutation = wallet ? updateWallet : createWallet;

  const [values, setValues] = useState<WalletFormValues>(() => walletFormValues(wallet));
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const set = <K extends keyof WalletFormValues>(key: K, value: WalletFormValues[K]) =>
    setValues((previous) => ({ ...previous, [key]: value }));

  function handleSubmit() {
    const onError = (error: unknown) => setFieldErrors(serverFieldErrors(error));
    if (wallet) {
      const result = toUpdateWalletRequest(values);
      setFieldErrors(result.success ? {} : result.errors);
      if (result.success) {
        updateWallet.mutate(
          { id: wallet.id, changes: result.data },
          { onSuccess: onDone, onError },
        );
      }
    } else {
      const result = toCreateWalletRequest(values);
      setFieldErrors(result.success ? {} : result.errors);
      if (result.success) {
        createWallet.mutate(result.data, { onSuccess: onDone, onError });
      }
    }
  }

  return (
    <FormScreen>
      <View style={styles.field}>
        <Text style={[styles.label, { color: theme.ink }]}>Loại ví</Text>
        <View accessibilityRole="radiogroup" style={styles.types}>
          {WALLET_TYPES.map((type) => {
            const selected = values.type === type;
            return (
              <Pressable
                key={type}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                accessibilityLabel={WALLET_TYPE_LABELS[type]}
                onPress={() => set("type", type)}
                style={[
                  styles.type,
                  {
                    backgroundColor: selected ? theme.surface : theme.field,
                    borderColor: selected ? theme.brand : "transparent",
                  },
                ]}
              >
                <WalletIcon type={type} size={36} />
                <Text
                  style={[styles.typeLabel, { color: selected ? theme.ink : theme.muted }]}
                  numberOfLines={2}
                >
                  {WALLET_TYPE_LABELS[type]}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <TextField
        label="Tên ví"
        value={values.name}
        onChangeText={(text) => set("name", text)}
        error={fieldErrors.name}
        placeholder="Ví dụ: Tiền mặt, Vietcombank"
        autoFocus={!wallet}
        returnKeyType="next"
      />
      <TextField
        label="Số dư ban đầu"
        value={values.amount}
        onChangeText={(text) => set("amount", text)}
        error={fieldErrors.initialBalance}
        placeholder="0"
        keyboardType="number-pad"
        suffix="₫"
        style={styles.amount}
      />
      <View style={styles.switches}>
        {/* No sign in the amount: the number pad has no minus key. */}
        <SwitchRow
          label="Đây là khoản nợ"
          hint="Số dư ban đầu là số âm, ví dụ dư nợ thẻ tín dụng."
          value={values.isDebt}
          onChange={(isDebt) => set("isDebt", isDebt)}
        />
        {wallet ? (
          <SwitchRow
            label="Lưu trữ ví"
            hint="Không tính vào tổng số dư, giao dịch cũ vẫn giữ nguyên."
            value={values.archived}
            onChange={(archived) => set("archived", archived)}
          />
        ) : null}
      </View>

      <FormError error={mutation.error} />
      <PrimaryButton
        title={wallet ? "Lưu thay đổi" : "Tạo ví"}
        onPress={handleSubmit}
        loading={mutation.isPending}
      />
      {footer}
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  field: { gap: 8 },
  label: { fontSize: 14, fontWeight: "600" },
  types: { flexDirection: "row", gap: 6 },
  type: {
    flex: 1,
    alignItems: "center",
    gap: 6,
    borderWidth: 2,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 2,
  },
  typeLabel: { fontSize: 10.5, fontWeight: "600", textAlign: "center" },
  amount: { fontSize: 24, fontWeight: "700", fontVariant: ["tabular-nums"] },
  switches: { gap: 8 },
});
