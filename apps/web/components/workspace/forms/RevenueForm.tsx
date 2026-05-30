"use client";

import { useState } from "react";
import type { Revenue, RevenueSource } from "@pr_hospitalagent/types";
import { revenueApi } from "@/hooks/useRevenue";
import { Field as Lbl } from "./Field";
import { FormModal, FormHeader, FormError, FormActions } from "./ui";

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
    <FormModal maxWidth={480}>
      <form onSubmit={submit}>
        <FormHeader
          title={editId ? `Sửa doanh thu ${editId}` : "Thêm doanh thu"}
        />
        <div className="p-4 space-y-3.5">
        <div className="grid grid-cols-2 gap-3">
          <Lbl label="Nguồn">
            <select
              value={source}
              onChange={(e) => setSource(e.target.value as RevenueSource)}
              className="ws-input"
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
              className="ws-input"
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
              className="ws-input"
              required
            />
          </Lbl>
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
        </div>
        <Lbl label="Mã bệnh nhân (tuỳ chọn)">
          <input
            value={patientId}
            onChange={(e) => setPatientId(e.target.value)}
            className="ws-input"
            placeholder="VD: BN001"
          />
        </Lbl>
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
