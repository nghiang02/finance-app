"use client";

import { type ClientErrorCode, useHealth } from "@finance/api-client";

const ERROR_MESSAGES: Partial<Record<ClientErrorCode, string>> = {
  NETWORK_ERROR: "Không truy cập được máy chủ.",
  SERVICE_UNAVAILABLE: "Máy chủ chạy nhưng chưa kết nối được cơ sở dữ liệu.",
  INTERNAL_ERROR: "Máy chủ đang gặp lỗi hoặc chưa được bật.",
};

export function ApiStatus() {
  const { data, error, isPending, isFetching, refetch } = useHealth();

  if (isPending) {
    return <p className="text-zinc-500">Đang kiểm tra kết nối…</p>;
  }

  if (error) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-red-600 dark:text-red-400">
          {ERROR_MESSAGES[error.code] ?? `Lỗi không xác định (${error.code}).`}
        </p>
        <button
          type="button"
          onClick={() => void refetch()}
          disabled={isFetching}
          className="rounded-lg border border-zinc-300 px-3 py-1 text-sm hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
        >
          {isFetching ? "Đang thử lại…" : "Thử lại"}
        </button>
      </div>
    );
  }

  return <p className="text-emerald-600 dark:text-emerald-400">API hoạt động ({data.status}).</p>;
}
