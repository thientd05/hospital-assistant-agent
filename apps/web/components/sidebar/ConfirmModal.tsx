"use client";

import { useEffect } from "react";

type Props = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Xóa",
  cancelLabel = "Hủy",
  busy = false,
  onConfirm,
  onCancel,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, busy, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={() => {
          if (!busy) onCancel();
        }}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        className="relative bg-white rounded-lg shadow-xl border border-gray-200 max-w-sm w-[90%] p-5"
      >
        <h3
          id="confirm-modal-title"
          className="font-semibold text-gray-900 mb-2"
        >
          {title}
        </h3>
        <p className="text-sm text-gray-600 mb-5 whitespace-pre-wrap">
          {message}
        </p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="px-3 py-1.5 text-sm rounded-md border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="px-3 py-1.5 text-sm rounded-md bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
          >
            {busy ? "Đang xóa..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
