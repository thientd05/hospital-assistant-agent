"use client";

import { useState } from "react";
import type {
  Utility,
  UtilityType,
  UtilityStatus,
} from "@pr_hospitalagent/types";
import { utilitiesApi } from "@/hooks/useUtilities";
import { Field as Lbl } from "./Field";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <form
        onSubmit={submit}
        className="w-[460px] max-w-[90vw] bg-white rounded-lg shadow-xl border border-gray-200 p-5 space-y-3 max-h-[90vh] overflow-y-auto"
      >
        <h3 className="text-base font-semibold text-gray-900">
          {editId ? `Sửa hoá đơn ${editId}` : "Thêm hoá đơn điện nước"}
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <Lbl label="Loại">
            <select
              value={type}
              onChange={(e) => onTypeChange(e.target.value as UtilityType)}
              className="input"
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
              className="input"
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
              className="input"
              required
            />
          </Lbl>
          <Lbl label="Chỉ số">
            <input
              type="number"
              min={0}
              value={usage}
              onChange={(e) => setUsage(e.target.value)}
              className="input"
              required
            />
          </Lbl>
          <Lbl label="Đơn vị">
            <input
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="input"
              required
            />
          </Lbl>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Lbl label="Trạng thái">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as UtilityStatus)}
              className="input"
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
              className="input"
              disabled={status !== "Đã thanh toán"}
            />
          </Lbl>
        </div>
        <Lbl label="Ghi chú">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="input"
            rows={2}
          />
        </Lbl>
        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {error}
          </div>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-3 py-1.5 text-sm rounded-md border border-gray-200 hover:bg-gray-50"
          >
            Huỷ
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-3 py-1.5 text-sm rounded-md bg-[#087E8B] text-white hover:bg-[#066671] disabled:opacity-50"
          >
            {submitting ? "Đang lưu…" : editId ? "Lưu" : "Tạo"}
          </button>
        </div>
        <style jsx>{`
          .input {
            width: 100%;
            font-size: 0.875rem;
            border: 1px solid rgb(229 231 235);
            border-radius: 0.375rem;
            padding: 0.375rem 0.625rem;
            outline: none;
            background: white;
          }
          .input:focus {
            border-color: #087e8b;
          }
          .input:disabled {
            background: rgb(243 244 246);
            color: rgb(156 163 175);
          }
        `}</style>
      </form>
    </div>
  );
}
