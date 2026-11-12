"use client";

import { type ClientErrorCode, useHealth } from "@finance/api-client";

import { cx } from "@/lib/cx";

const ERROR_MESSAGES: Partial<Record<ClientErrorCode, string>> = {
  NETWORK_ERROR: "Không truy cập được máy chủ",
  SERVICE_UNAVAILABLE: "Máy chủ chưa kết nối được cơ sở dữ liệu",
  INTERNAL_ERROR: "Máy chủ đang gặp lỗi",
};

/** Small server status line, handy while developing. */
export function ApiStatus() {
  const { error, isPending, isFetching, refetch } = useHealth();
  const label = isPending
    ? "Đang kiểm tra máy chủ…"
    : error
      ? (ERROR_MESSAGES[error.code] ?? `Lỗi máy chủ (${error.code})`)
      : "Máy chủ hoạt động";

  return (
    <p className="flex items-center justify-center gap-2 text-xs text-muted">
      <span
        aria-hidden
        className={cx(
          "size-2 rounded-full",
          isPending ? "bg-muted" : error ? "bg-expense" : "bg-brand-500",
        )}
      />
      {label}
      {error ? (
        <button
          type="button"
          onClick={() => void refetch()}
          disabled={isFetching}
          className="font-semibold text-brand-600 hover:underline disabled:opacity-50"
        >
          Thử lại
        </button>
      ) : null}
    </p>
  );
}
