"use client";

import { useEffect, useState } from "react";
import type { AppointmentStatus } from "@pr_hospitalagent/types";
import { useAppointments, appointmentsApi } from "@/hooks/useAppointments";
import { useDoctors } from "@/hooks/useDoctors";
import { useManagingDoctors } from "@/hooks/useManagingDoctors";

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
};

export function MyAppointmentsTab({ version, active }: Props) {
  const { data, loading, error, refetch } = useAppointments(version, active);
  const [showForm, setShowForm] = useState(false);

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
            data-agent-label="Đặt lịch hẹn"
            className="text-sm px-3 py-1.5 rounded-md bg-[#087E8B] text-white hover:bg-[#066671]"
          >
            + Đặt lịch
          </button>
        )}
      </div>
      {showForm && (
        <BookingForm
          active={active}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            refetch();
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
            className="rounded-lg border border-gray-200 px-3 py-2.5"
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
            <div className="mt-1 text-sm text-gray-900">
              {a.doctorId
                ? `Bác sĩ: ${a.doctorId}`
                : "Đang chờ phòng khám phân bác sĩ"}
            </div>
            <div className="mt-0.5 text-xs text-gray-500 line-clamp-2">
              {a.reason}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function BookingForm({
  active,
  onClose,
  onSaved,
}: {
  active: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const doctorsRes = useDoctors(0, active);
  const managingRes = useManagingDoctors(0, active);

  const [doctorId, setDoctorId] = useState<string>("");
  const [doctorTouched, setDoctorTouched] = useState(false);
  const [day, setDay] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [time, setTime] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const managingIds = new Set(
    (managingRes.data?.doctors ?? []).map((d) => d.id)
  );

  // Mặc định = bác sĩ đang quản lý đầu tiên (nếu có); BN chưa ai quản lý → "" (hàng chờ chung).
  useEffect(() => {
    if (doctorTouched) return;
    const first = managingRes.data?.doctors?.[0]?.id;
    if (first) setDoctorId(first);
  }, [managingRes.data, doctorTouched]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!day || !month || !year || !time || !reason.trim()) {
      setError("Cần nhập đủ thời gian và lý do.");
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
      await appointmentsApi.createAsPatient({
        scheduledAt: scheduled.toISOString(),
        reason: reason.trim(),
        ...(doctorId ? { doctorId } : {}),
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
      <h3 className="text-base font-semibold text-gray-900">Đặt lịch hẹn</h3>
      <label className="block">
        <span className="block text-xs text-gray-500 mb-0.5">Bác sĩ</span>
        <select
          value={doctorId}
          onChange={(e) => {
            setDoctorTouched(true);
            setDoctorId(e.target.value);
          }}
          className="input"
          data-agent-ref="booking-form:doctorId"
          data-agent-role="combobox"
          data-agent-label="Bác sĩ"
        >
          <option value="">Để phòng khám sắp xếp (ai duyệt trước nhận)</option>
          {(doctorsRes.data?.doctors ?? []).map((d) => (
            <option key={d.id} value={d.id}>
              {d.fullName}
              {d.department ? ` · ${d.department}` : ""}
              {managingIds.has(d.id) ? " (Bác sĩ của bạn)" : ""}
            </option>
          ))}
        </select>
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
              data-agent-ref="booking-form:day"
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
              data-agent-ref="booking-form:month"
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
              data-agent-ref="booking-form:year"
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
              data-agent-ref="booking-form:time"
              data-agent-role="textbox"
              data-agent-label="Giờ"
            />
          </label>
        </div>
      </div>
      <label className="block">
        <span className="block text-xs text-gray-500 mb-0.5">Lý do khám</span>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="input"
          rows={2}
          required
          data-agent-ref="booking-form:reason"
          data-agent-role="textbox"
          data-agent-label="Lý do khám"
        />
      </label>
      {error && (
        <div
          className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2"
          data-agent-ref="booking-form:error"
          data-agent-role="alert"
          data-agent-label="Lỗi form đặt lịch"
        >
          {error}
        </div>
      )}
      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          data-agent-ref="booking-form:cancel"
          data-agent-role="button"
          data-agent-label="Huỷ"
          className="px-3 py-1.5 text-sm rounded-md border border-gray-200 hover:bg-gray-50"
        >
          Huỷ
        </button>
        <button
          type="submit"
          disabled={submitting}
          data-agent-ref="booking-form:submit"
          data-agent-role="button"
          data-agent-label="Đặt lịch"
          data-agent-busy={submitting ? "true" : undefined}
          className="px-3 py-1.5 text-sm rounded-md bg-[#087E8B] text-white hover:bg-[#066671] disabled:opacity-50"
        >
          {submitting ? "Đang gửi…" : "Đặt lịch"}
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
          border-color: rgb(8 126 139);
        }
      `}</style>
    </form>
  );
}
