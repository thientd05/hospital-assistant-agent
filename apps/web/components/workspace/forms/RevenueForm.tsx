"use client";

import { useState } from "react";
import type { Revenue, RevenueSource } from "@pr_hospitalagent/types";
import { revenueApi } from "@/hooks/useRevenue";
import { Field as Lbl } from "./Field";

const SOURCES: RevenueSource[] = [
  "Khám bệnh",
  "Xét nghiệm",
  "Bán thuốc",
  "Dịch vụ khác",
];

function toDateInput(d: Date | string | undefined): string {
  if (!d) return "";
  const dt = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(dt.getTime())) return "";
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function periodFromDate(dateStr: string): string {
  if (!dateStr) return "";
  const [y, m] = dateStr.split("-");
  if (!y || !m) return "";
  return `${y}-${m}`;
}

function todayStr(): string {
  return toDateInput(new Date());
}

type Props = {
  initial?: Partial<Revenue>;
  editId?: string;
  onClose: () => void;
  onSaved: () => void;
};

export function RevenueForm({ initial, editId, onClose, onSaved }: Props) {
  const initialDate = toDateInput(initial?.date) || todayStr();
  const [source, setSource] = useState<RevenueSource>(
    (initial?.source as RevenueSource) ?? "Khám bệnh"
  );
  const [date, setDate] = useState(initialDate);
  const [period, setPeriod] = useState(
    initial?.period ?? periodFromDate(initialDate)
  );
  const [amount, setAmount] = useState(
    initial?.amount !== undefined ? String(initial.amount) : ""
  );
  const [patientId, setPatientId] = useState(initial?.patientId ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onDateChange(v: string) {
    setDate(v);
    const p = periodFromDate(v);
    if (p) setPeriod(p);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!date) {
      setError("Hãy nhập ngày phát sinh.");
      return;
    }
    if (!period.match(/^\d{4}-\d{2}$/)) {
      setError("Kỳ phải có dạng YYYY-MM.");
      return;
    }
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt < 0) {
      setError("Số tiền không hợp lệ.");
      return;
    }
    const body = {
      source,
      period,
      amount: amt,
      date,
      patientId: patientId.trim() || undefined,
      notes: notes.trim() || undefined,
    };
    setSubmitting(true);
    try {
      if (editId) {
        await revenueApi.update(editId, body);
      } else {
        await revenueApi.create(body);
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
        className="w-[460px] max-w-[90vw] bg-white rounded-lg shadow-xl border border-gray-200 p-5 space-y-3 max-h-[90dvh] overflow-y-auto"
      >
        <h3 className="text-base font-semibold text-gray-900">
          {editId ? `Sửa doanh thu ${editId}` : "Thêm doanh thu"}
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <Lbl label="Nguồn">
            <select
              value={source}
              onChange={(e) => setSource(e.target.value as RevenueSource)}
              className="input"
            >
              {SOURCES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Lbl>
          <Lbl label="Ngày phát sinh">
            <input
              type="date"
              value={date}
              onChange={(e) => onDateChange(e.target.value)}
              className="input"
              required
            />
          </Lbl>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Lbl label="Kỳ (YYYY-MM)">
            <input
              type="month"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="input"
              required
            />
          </Lbl>
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
        </div>
        <Lbl label="Mã bệnh nhân (tuỳ chọn)">
          <input
            value={patientId}
            onChange={(e) => setPatientId(e.target.value)}
            className="input"
            placeholder="VD: BN001"
          />
        </Lbl>
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
        `}</style>
      </form>
    </div>
  );
}
