"use client";

import { Trash2 } from "lucide-react";
import type { ReactNode } from "react";

import { Dialog } from "@/components/Dialog";
import { FormError } from "@/components/FormError";
import { Button } from "@/components/ui/Button";

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  pending: boolean;
  error: unknown;
}

export function ConfirmDialog({
  open,
  onClose,
  title,
  children,
  confirmLabel,
  onConfirm,
  pending,
  error,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} title={title}>
      <div className="flex gap-4">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-expense/10 text-expense">
          <Trash2 aria-hidden className="size-5" />
        </span>
        <div className="flex flex-col gap-2 text-sm leading-relaxed text-muted">{children}</div>
      </div>
      <FormError error={error} />
      <div className="flex justify-end gap-2">
        <Button onClick={onClose}>Hủy</Button>
        <Button variant="danger" onClick={onConfirm} disabled={pending}>
          {pending ? "Đang xử lý…" : confirmLabel}
        </Button>
      </div>
    </Dialog>
  );
}
