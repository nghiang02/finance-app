"use client";

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
import { type Wallet, WALLET_TYPE_COLORS, WALLET_TYPE_LABELS, WALLET_TYPES } from "@finance/shared";
import { type FormEvent, useState } from "react";

import { Dialog } from "@/components/Dialog";
import { FormError } from "@/components/FormError";
import { TextField } from "@/components/TextField";
import { Button } from "@/components/ui/Button";
import { SwitchField } from "@/components/ui/SwitchField";
import { WALLET_TYPE_ICONS } from "@/components/wallets/WalletIcon";
import { tint } from "@/lib/cx";

interface WalletFormDialogProps {
  open: boolean;
  onClose: () => void;
  /** Edit this wallet; create a new one when undefined. */
  wallet?: Wallet | undefined;
}

export function WalletFormDialog({ open, onClose, wallet }: WalletFormDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} title={wallet ? "Sửa ví" : "Thêm ví mới"}>
      <WalletForm wallet={wallet} onDone={onClose} />
    </Dialog>
  );
}

function WalletForm({ wallet, onDone }: { wallet: Wallet | undefined; onDone: () => void }) {
  const createWallet = useCreateWallet();
  const updateWallet = useUpdateWallet();
  const mutation = wallet ? updateWallet : createWallet;

  const [values, setValues] = useState<WalletFormValues>(() => walletFormValues(wallet));
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const set = <K extends keyof WalletFormValues>(key: K, value: WalletFormValues[K]) =>
    setValues((previous) => ({ ...previous, [key]: value }));

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">Loại ví</legend>
        <div className="grid grid-cols-5 gap-2">
          {WALLET_TYPES.map((type) => {
            const Icon = WALLET_TYPE_ICONS[type];
            const color = WALLET_TYPE_COLORS[type];
            const selected = values.type === type;
            return (
              <label
                key={type}
                className="flex cursor-pointer flex-col items-center gap-1.5 rounded-2xl border-2 border-transparent bg-field px-1 py-3 text-center text-[11px] leading-tight font-medium text-muted transition has-checked:border-brand-500 has-checked:bg-surface has-checked:text-ink has-focus-visible:ring-4 has-focus-visible:ring-brand-500/20"
              >
                <input
                  type="radio"
                  name="wallet-type"
                  value={type}
                  checked={selected}
                  onChange={() => set("type", type)}
                  className="sr-only"
                />
                <span
                  aria-hidden
                  className="flex size-9 items-center justify-center rounded-xl"
                  style={{ backgroundColor: tint(color), color }}
                >
                  <Icon className="size-5" />
                </span>
                {WALLET_TYPE_LABELS[type]}
              </label>
            );
          })}
        </div>
      </fieldset>

      <TextField
        id="wallet-name"
        label="Tên ví"
        value={values.name}
        onChange={(event) => set("name", event.target.value)}
        error={fieldErrors.name}
        placeholder="Ví dụ: Tiền mặt, Vietcombank"
        autoFocus
      />
      <TextField
        id="wallet-initial-balance"
        label="Số dư ban đầu"
        inputMode="numeric"
        value={values.amount}
        onChange={(event) => set("amount", event.target.value)}
        error={fieldErrors.initialBalance}
        placeholder="0"
        suffix="₫"
        className="h-14 text-xl font-semibold tabular-nums"
      />

      <div className="flex flex-col gap-2">
        {/* The amount is typed without a sign: phone number keyboards have no minus key,
            and "debt" is how people think about a credit card balance. */}
        <SwitchField
          id="wallet-is-debt"
          label="Đây là khoản nợ"
          hint="Số dư ban đầu là số âm, ví dụ dư nợ thẻ tín dụng."
          checked={values.isDebt}
          onChange={(event) => set("isDebt", event.target.checked)}
        />
        {wallet ? (
          <SwitchField
            id="wallet-archived"
            label="Lưu trữ ví"
            hint="Không tính vào tổng số dư, giao dịch cũ vẫn giữ nguyên."
            checked={values.archived}
            onChange={(event) => set("archived", event.target.checked)}
          />
        ) : null}
      </div>

      {mutation.isError && Object.keys(serverFieldErrors(mutation.error)).length === 0 ? (
        <FormError error={mutation.error} />
      ) : null}

      <Button type="submit" variant="primary" size="lg" disabled={mutation.isPending}>
        {mutation.isPending ? "Đang lưu…" : wallet ? "Lưu thay đổi" : "Tạo ví"}
      </Button>
    </form>
  );
}
