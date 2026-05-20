"use client";

import { useState } from "react";
import type {
  Appointment,
  AppointmentStatus,
} from "@pr_hospitalagent/types";
import {
  useAppointments,
  appointmentsApi,
} from "@/hooks/useAppointments";
import { ConfirmModal } from "@/components/sidebar/ConfirmModal";

const STATUS_STYLES: Record<AppointmentStatus, string> = {
  "Chờ duyệt": "bg-amber-50 text-amber-700 ring-amber-200",
  "Đã duyệt": "bg-blue-50 text-blue-700 ring-blue-200",
  "Thành công": "bg-emerald-50 text-emerald-700 ring-emerald-200",
};

const dateFormatter = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function fmt(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return String(value);
  return dateFormatter.format(d);
}

type Props = {
  version: number;
  active: boolean;
  onChanged: () => void;
};

export function AppointmentsTab({ version, active, onChanged }: Props) {
  const { data, loading, error, refetch } = useAppointments(version, active);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  async function handleStatus(id: string, next: AppointmentStatus) {
    setBusy(id);
    try {
      await appointmentsApi.update(id, { status: next });
      refetch();
      onChanged();
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }
  async function confirmDelete() {
    if (!confirmId) return;
    const id = confirmId;
    setBusy(id);
    try {
      await appointmentsApi.remove(id);
      setConfirmId(null);
      refetch();
      onChanged();
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="px-5 py-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-[11px] uppercase tracking-wider text-gray-400 font-medium">
          {data?.length ?? 0} cuộc hẹn
        </div>
        {!showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            data-agent-ref="appointment:create"
            data-agent-role="button"
            data-agent-label="Tạo lịch hẹn"
            className="text-sm px-3 py-1.5 rounded-md bg-[#087E8B] text-white hover:bg-[#066671]"
          >
            + Tạo
          </button>
        )}
      </div>
      {showForm && (
        <AppointmentForm
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            refetch();
            onChanged();
          }}
        />
      )}
      {loading && (
        <div className="text-sm text-gray-400 text-center py-4">Đang tải…</div>
      )}
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {error}
        </div>
      )}
      <ul className="space-y-2">
        {(data ?? []).map((a) => (
          <li
            key={a.id}
            className="rounded-lg border border-gray-200 px-3 py-2.5 hover:bg-gray-50"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="text-xs text-gray-500 font-medium tabular-nums">
                {fmt(a.scheduledAt)}
              </div>
              <span
                className={`shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-full ring-1 ring-inset ${STATUS_STYLES[a.status]}`}
              >
                {a.status}
              </span>
            </div>
            <div className="mt-1 text-sm text-gray-900 font-medium">
              {a.patientName ? `${a.patientName} · ${a.patientId}` : a.patientId}
            </div>
            <div className="mt-0.5 text-xs text-gray-500 line-clamp-2">
              {a.reason}
            </div>
            {a.status !== "Thành công" && (
              <div className="mt-2 flex items-center justify-end gap-1.5">
                {a.status === "Chờ duyệt" && (
                  <button
                    type="button"
                    disabled={busy === a.id}
                    onClick={() => handleStatus(a.id, "Đã duyệt")}
                    data-agent-ref={`appointment:${a.id}:approve`}
                    data-agent-role="button"
                    data-agent-label={`Duyệt lịch hẹn ${a.id}`}
                    className="text-[11px] px-2 py-1 rounded-md border border-blue-200 text-blue-700 hover:bg-blue-50 disabled:opacity-50"
                  >
                    Duyệt
                  </button>
                )}
                {a.status === "Đã duyệt" && (
                  <button
                    type="button"
                    disabled={busy === a.id}
                    onClick={() => handleStatus(a.id, "Thành công")}
                    data-agent-ref={`appointment:${a.id}:complete`}
                    data-agent-role="button"
                    data-agent-label={`Hoàn tất lịch hẹn ${a.id}`}
                    className="text-[11px] px-2 py-1 rounded-md border border-emerald-200 text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                  >
                    Hoàn tất
                  </button>
                )}
                <button
                  type="button"
                  disabled={busy === a.id}
                  onClick={() => setConfirmId(a.id)}
                  data-agent-ref={`appointment:${a.id}:cancel`}
                  data-agent-role="button"
                  data-agent-label={`Huỷ lịch hẹn ${a.id}`}
                  className="text-[11px] px-2 py-1 rounded-md border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-50"
                >
                  Huỷ
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>

      <ConfirmModal
        open={confirmId !== null}
        title="Huỷ lịch hẹn"
        message={`Bạn có chắc muốn huỷ lịch hẹn ${confirmId ?? ""}?`}
        confirmLabel="Huỷ lịch"
        cancelLabel="Đóng"
        busy={busy !== null && busy === confirmId}
        onConfirm={confirmDelete}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
}

function AppointmentForm({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const [patientId, setPatientId] = useState("");
  const [day, setDay] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [time, setTime] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (
      !patientId.trim() ||
      !day ||
      !month ||
      !year ||
      !time ||
      !reason.trim()
    ) {
      setError("Cần nhập đủ thông tin.");
      return;
    }
    const d = Number(day);
    const m = Number(month);
    const y = Number(year);
    const [hh, mm] = time.split(":").map(Number);
    if (
      !Number.isInteger(d) ||
      d < 1 ||
      d > 31 ||
      !Number.isInteger(m) ||
      m < 1 ||
      m > 12 ||
      !Number.isInteger(y) ||
      y < 1900 ||
      y > 9999 ||
      !Number.isInteger(hh) ||
      !Number.isInteger(mm)
    ) {
      setError("Ngày/tháng/năm/giờ không hợp lệ.");
      return;
    }
    const scheduled = new Date(y, m - 1, d, hh, mm);
    if (
      Number.isNaN(scheduled.getTime()) ||
      scheduled.getDate() !== d ||
      scheduled.getMonth() !== m - 1 ||
      scheduled.getFullYear() !== y
    ) {
      setError("Ngày tháng không tồn tại.");
      return;
    }
    setSubmitting(true);
    try {
      await appointmentsApi.create({
        patientId: patientId.trim(),
        scheduledAt: scheduled.toISOString(),
        reason: reason.trim(),
      });
      onSaved();
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : String(e2));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="bg-white rounded-lg border border-gray-200 p-4 space-y-3"
    >
      <h3 className="text-base font-semibold text-gray-900">Tạo lịch hẹn</h3>
      <label className="block">
        <span className="block text-xs text-gray-500 mb-0.5">Mã BN</span>
        <input
          value={patientId}
          onChange={(e) => setPatientId(e.target.value)}
          placeholder="BN001"
          className="input"
          required
          data-agent-ref="appointment-form:patientId"
          data-agent-role="textbox"
          data-agent-label="Mã BN"
        />
      </label>
      <div>
        <span className="block text-xs text-gray-500 mb-0.5">Thời gian</span>
        <div className="grid grid-cols-4 gap-2">
          <label className="block">
            <span className="block text-[11px] text-gray-400 mb-0.5">Ngày</span>
            <input
              type="number"
              min={1}
              max={31}
              value={day}
              onChange={(e) => setDay(e.target.value)}
              placeholder="DD"
              className="input"
              required
              data-agent-ref="appointment-form:day"
              data-agent-role="textbox"
              data-agent-label="Ngày"
            />
          </label>
          <label className="block">
            <span className="block text-[11px] text-gray-400 mb-0.5">Tháng</span>
            <input
              type="number"
              min={1}
              max={12}
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              placeholder="MM"
              className="input"
              required
              data-agent-ref="appointment-form:month"
              data-agent-role="textbox"
              data-agent-label="Tháng"
            />
          </label>
          <label className="block">
            <span className="block text-[11px] text-gray-400 mb-0.5">Năm</span>
            <input
              type="number"
              min={1900}
              max={9999}
              value={year}
              onChange={(e) => setYear(e.target.value)}
              placeholder="YYYY"
              className="input"
              required
              data-agent-ref="appointment-form:year"
              data-agent-role="textbox"
              data-agent-label="Năm"
            />
          </label>
          <label className="block">
            <span className="block text-[11px] text-gray-400 mb-0.5">Giờ</span>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="input"
              required
              data-agent-ref="appointment-form:time"
              data-agent-role="textbox"
              data-agent-label="Giờ"
            />
          </label>
        </div>
      </div>
      <label className="block">
        <span className="block text-xs text-gray-500 mb-0.5">Lý do</span>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="input"
          rows={2}
          required
          data-agent-ref="appointment-form:reason"
          data-agent-role="textbox"
          data-agent-label="Lý do"
        />
      </label>
      {error && (
        <div
          className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2"
          data-agent-ref="appointment-form:error"
          data-agent-role="alert"
          data-agent-label="Lỗi form lịch hẹn"
        >
          {error}
        </div>
      )}
      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          data-agent-ref="appointment-form:cancel"
          data-agent-role="button"
          data-agent-label="Huỷ"
          className="px-3 py-1.5 text-sm rounded-md border border-gray-200 hover:bg-gray-50"
        >
          Huỷ
        </button>
        <button
          type="submit"
          disabled={submitting}
          data-agent-ref="appointment-form:submit"
          data-agent-role="button"
          data-agent-label="Tạo lịch hẹn"
          data-agent-busy={submitting ? "true" : undefined}
          className="px-3 py-1.5 text-sm rounded-md bg-[#087E8B] text-white hover:bg-[#066671] disabled:opacity-50"
        >
          {submitting ? "Đang lưu…" : "Tạo"}
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
        }
        .input:focus {
          border-color: rgb(168 85 247);
        }
      `}</style>
    </form>
  );
}
