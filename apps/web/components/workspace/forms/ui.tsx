import type { ReactNode } from "react";

/**
 * Khung dùng chung cho mọi form tạo/sửa trong panel + admin.
 * Gom style nút/input về một nguồn (globals.css: .ws-input, .ws-btn-*),
 * giữ UI nhất quán, gọn gàng. Không đụng tới data-agent-* (truyền qua props).
 */

/** Overlay + card cho form dạng popup (bác sĩ / chuyên gia / tài chính). */
export function FormModal({
  children,
  maxWidth = 460,
}: {
  children: ReactNode;
  maxWidth?: number;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div
        className="w-full max-h-[90dvh] overflow-y-auto rounded-2xl bg-white shadow-2xl ring-1 ring-black/5"
        style={{ maxWidth }}
      >
        {children}
      </div>
    </div>
  );
}

/** Tiêu đề form + đường kẻ phân cách. */
export function FormHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="px-4 py-3.5 border-b border-gray-100">
      <h3 className="text-[15px] font-semibold text-gray-900 leading-snug">
        {title}
      </h3>
      {subtitle && <p className="mt-1 text-xs text-gray-400">{subtitle}</p>}
    </div>
  );
}

/** Hộp báo lỗi đỏ; truyền agentRef để gắn role="alert" cho agent. */
export function FormError({
  children,
  agentRef,
  agentLabel,
}: {
  children: ReactNode;
  agentRef?: string;
  agentLabel?: string;
}) {
  return (
    <div
      className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2"
      data-agent-ref={agentRef}
      data-agent-role={agentRef ? "alert" : undefined}
      data-agent-label={agentLabel}
    >
      {children}
    </div>
  );
}

type BtnAttrs = Record<string, string | boolean | undefined>;

/** Hàng nút Huỷ / Lưu cuối form. submitProps/cancelProps để gắn data-agent-*. */
export function FormActions({
  onCancel,
  submitting,
  submitLabel,
  pendingLabel = "Đang lưu…",
  cancelLabel = "Huỷ",
  submitProps,
  cancelProps,
}: {
  onCancel: () => void;
  submitting: boolean;
  submitLabel: string;
  pendingLabel?: string;
  cancelLabel?: string;
  submitProps?: BtnAttrs;
  cancelProps?: BtnAttrs;
}) {
  return (
    <div className="flex justify-end gap-2 pt-1">
      <button
        type="button"
        onClick={onCancel}
        disabled={submitting}
        className="ws-btn-ghost"
        {...cancelProps}
      >
        {cancelLabel}
      </button>
      <button
        type="submit"
        disabled={submitting}
        className="ws-btn-primary"
        {...submitProps}
      >
        {submitting ? pendingLabel : submitLabel}
      </button>
    </div>
  );
}
