"use client";

import { useState } from "react";
import type {
  Utility,
  UtilityType,
  UtilityStatus,
} from "@pr_hospitalagent/types";
import { utilitiesApi } from "@/hooks/useUtilities";
import { Field as Lbl } from "./Field";
import { FormModal, FormHeader, FormError, FormActions } from "./ui";

const TYPES: UtilityType[] = ["Điện", "Nước", "Internet", "Gas"];
const STATUSES: UtilityStatus[] = ["Chưa thanh toán", "Đã thanh toán"];
const DEFAULT_UNIT: Record<UtilityType, string> = {
  "Điện": "kWh",
  "Nước": "m³",
  Internet: "tháng",
  Gas: "kg",
};

function toDateInput(d: Date | string | null | undefined): string {
  if (!d) return "";
  const dt = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(dt.getTime())) return "";
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function thisMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

type Props = {
  initial?: Partial<Utility>;
  editId?: string;
  onClose: () => void;
  onSaved: () => void;
};

export function UtilityForm({ initial, editId, onClose, onSaved }: Props) {
  const [type, setType] = useState<UtilityType>(
    (initial?.type as UtilityType) ?? "Điện"
  );
  const [period, setPeriod] = useState(initial?.period ?? thisMonth());
  const [amount, setAmount] = useState(
    initial?.amount ? String(initial.amount) : ""
  );
  const [usage, setUsage] = useState(
    initial?.usage !== undefined ? String(initial.usage) : ""
  );
  const [unit, setUnit] = useState(
    initial?.unit ?? DEFAULT_UNIT[(initial?.type as UtilityType) ?? "Điện"]
  );
  const [status, setStatus] = useState<UtilityStatus>(
    (initial?.status as UtilityStatus) ?? "Chưa thanh toán"
  );
  const [paidDate, setPaidDate] = useState(toDateInput(initial?.paidDate));
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onTypeChange(t: UtilityType) {
    setType(t);
    if (!editId) setUnit(DEFAULT_UNIT[t]);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!period.match(/^\d{4}-\d{2}$/)) {
      setError("Kỳ thanh toán phải có dạng YYYY-MM.");
      return;
    }
    const amt = Number(amount);
    const u = Number(usage);
    if (!Number.isFinite(amt) || amt < 0) {
      setError("Số tiền không hợp lệ.");
      return;
    }
    if (!Number.isFinite(u) || u < 0) {
      setError("Chỉ số tiêu thụ không hợp lệ.");
      return;
    }
    if (!unit.trim()) {
      setError("Đơn vị không được bỏ trống.");
      return;
    }
    const body = {
      type,
      period,
      amount: amt,
      usage: u,
      unit: unit.trim(),
      status,
      paidDate: status === "Đã thanh toán" ? paidDate || null : null,
      notes: notes.trim() || undefined,
    };
    setSubmitting(true);
    try {
      if (editId) {
        await utilitiesApi.update(editId, body);
      } else {
        await utilitiesApi.create(body);
      }
      onSaved();
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : String(e2));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <FormModal maxWidth={480}>
      <form onSubmit={submit}>
        <FormHeader
          title={editId ? `Sửa hoá đơn ${editId}` : "Thêm hoá đơn điện nước"}
        />
        <div className="p-4 space-y-3.5">
        <div className="grid grid-cols-2 gap-3">
          <Lbl label="Loại">
            <select
              value={type}
              onChange={(e) => onTypeChange(e.target.value as UtilityType)}
              className="ws-input"
            >
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </Lbl>
          <Lbl label="Kỳ (YYYY-MM)">
            <input
              type="month"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="ws-input"
              required
            />
          </Lbl>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Lbl label="Số tiền (VND)">
            <input
              type="number"
              min={0}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="ws-input"
              required
            />
          </Lbl>
          <Lbl label="Chỉ số">
            <input
              type="number"
              min={0}
              value={usage}
              onChange={(e) => setUsage(e.target.value)}
              className="ws-input"
              required
            />
          </Lbl>
          <Lbl label="Đơn vị">
            <input
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="ws-input"
              required
            />
          </Lbl>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Lbl label="Trạng thái">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as UtilityStatus)}
              className="ws-input"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Lbl>
          <Lbl label="Ngày thanh toán">
            <input
              type="date"
              value={paidDate}
              onChange={(e) => setPaidDate(e.target.value)}
              className="ws-input"
              disabled={status !== "Đã thanh toán"}
            />
          </Lbl>
        </div>
        <Lbl label="Ghi chú">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="ws-input"
            rows={2}
          />
        </Lbl>
        {error && <FormError>{error}</FormError>}
        <FormActions
          onCancel={onClose}
          submitting={submitting}
          submitLabel={editId ? "Lưu" : "Tạo"}
        />
        </div>
      </form>
    </FormModal>
  );
}
