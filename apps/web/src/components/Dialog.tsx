"use client";

import { X } from "lucide-react";
import { type ReactNode, useEffect, useId, useRef } from "react";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

/**
 * Modal built on the native <dialog> element: the browser handles focus trapping, Escape
 * and the backdrop, so no UI library is needed. Content is rendered only while open,
 * so a form inside starts fresh every time. On small screens it opens as a bottom sheet.
 */
export function Dialog({ open, onClose, title, children }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) {
      return;
    }
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      className="m-auto w-full max-w-md rounded-3xl bg-surface p-0 text-ink shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-sm max-sm:mb-0 max-sm:max-w-none max-sm:rounded-b-none"
    >
      {open ? (
        <div className="flex max-h-[85vh] flex-col">
          <div className="flex items-center justify-between gap-4 px-6 pt-5 pb-3">
            <h2 id={titleId} className="text-lg font-semibold">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng"
              className="inline-flex size-9 items-center justify-center rounded-full bg-field text-muted transition hover:text-ink"
            >
              <X aria-hidden className="size-4.5" />
            </button>
          </div>
          <div className="flex flex-col gap-5 overflow-y-auto px-6 pt-2 pb-6">{children}</div>
        </div>
      ) : null}
    </dialog>
  );
}
