import { type ApiError, describeError } from "@finance/api-client";
import { CloudOff, RotateCw } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";

interface QueryStatusProps {
  error: ApiError | null;
  onRetry: () => void;
  retrying: boolean;
  /** Number of placeholder rows while loading. */
  rows?: number;
}

/** Skeleton while a list loads; the error with a retry button if it failed. */
export function QueryStatus({ error, onRetry, retrying, rows = 3 }: QueryStatusProps) {
  if (!error) {
    return (
      <div role="status" aria-label="Đang tải" className="flex flex-col gap-3">
        {Array.from({ length: rows }, (_, index) => (
          <Skeleton key={index} className="h-18" />
        ))}
      </div>
    );
  }
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-4 rounded-3xl bg-surface px-6 py-12 text-center"
    >
      <span className="flex size-12 items-center justify-center rounded-full bg-expense/10 text-expense">
        <CloudOff aria-hidden className="size-6" />
      </span>
      <p className="text-muted">{describeError(error)}</p>
      <Button size="sm" icon={RotateCw} onClick={onRetry} disabled={retrying}>
        {retrying ? "Đang thử lại…" : "Thử lại"}
      </Button>
    </div>
  );
}
