"use client";

import { useEffect, useState } from "react";
import { useAppointments, appointmentsApi } from "@/hooks/useAppointments";
import { useDoctors } from "@/hooks/useDoctors";
import { useManagingDoctors } from "@/hooks/useManagingDoctors";
import { formatDateTime as fmt } from "@/lib/format";
import { APPOINTMENT_STATUS_STYLES as STATUS_STYLES } from "@/lib/appointment";
import { Field } from "../forms/Field";
import { FormHeader, FormError, FormActions } from "../forms/ui";

type Props = {
  version: number;
  active: boolean;
};

export function MyAppointmentsTab({ version, active }: Props) {
  const { data, loading, error, refetch } = useAppointments(version, active);
  const doctorsRes = useDoctors(0, active);
  const [showForm, setShowForm] = useState(false);

  const doctorById = new Map(
    (doctorsRes.data?.doctors ?? []).map((d) => [d.id, d])
  );

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
        <div data-agent-loading="true" className="text-sm text-gray-400 text-center py-4">Đang tải…</div>
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
            {a.doctorId ? (
              (() => {
                const doc = doctorById.get(a.doctorId);
                return (
                  <div className="mt-1 text-sm text-gray-900">
                    <div className="font-medium">
                      {doc?.fullName
                        ? `${doc.title ? `${doc.title} ` : ""}${doc.fullName}`
                        : `Bác sĩ: ${a.doctorId}`}
                    </div>
                    {doc && (doc.department || doc.phone) && (
                      <div className="mt-0.5 text-xs text-gray-500">
                        {doc.department}
                        {doc.department && doc.phone ? " · " : ""}
                        {doc.phone && `ĐT: ${doc.phone}`}
                      </div>
                    )}
                  </div>
                );
              })()
            ) : (
              <div className="mt-1 text-sm text-gray-900">
                Đang chờ phòng khám phân bác sĩ
              </div>
            )}
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
      className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
    >
      <FormHeader title="Đặt lịch hẹn" />
      <div className="p-4 space-y-3.5">
      <Field label="Bác sĩ">
        <select
          value={doctorId}
          onChange={(e) => {
            setDoctorTouched(true);
            setDoctorId(e.target.value);
          }}
          className="ws-input"
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
      </Field>
      <div>
        <span className="ws-label">Thời gian</span>
        <div className="grid grid-cols-4 gap-2">
          <label className="block">
            <span className="block text-[11px] text-gray-400 mb-1">Ngày</span>
            <input
              type="number"
              min={1}
              max={31}
              value={day}
              onChange={(e) => setDay(e.target.value)}
              placeholder="DD"
              className="ws-input"
              required
              data-agent-ref="booking-form:day"
              data-agent-role="textbox"
              data-agent-label="Ngày"
            />
          </label>
          <label className="block">
            <span className="block text-[11px] text-gray-400 mb-1">Tháng</span>
            <input
              type="number"
              min={1}
              max={12}
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              placeholder="MM"
              className="ws-input"
              required
              data-agent-ref="booking-form:month"
              data-agent-role="textbox"
              data-agent-label="Tháng"
            />
          </label>
          <label className="block">
            <span className="block text-[11px] text-gray-400 mb-1">Năm</span>
            <input
              type="number"
              min={1900}
              max={9999}
              value={year}
              onChange={(e) => setYear(e.target.value)}
              placeholder="YYYY"
              className="ws-input"
              required
              data-agent-ref="booking-form:year"
              data-agent-role="textbox"
              data-agent-label="Năm"
            />
          </label>
          <label className="block">
            <span className="block text-[11px] text-gray-400 mb-1">Giờ</span>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="ws-input"
              required
              data-agent-ref="booking-form:time"
              data-agent-role="textbox"
              data-agent-label="Giờ"
            />
          </label>
        </div>
      </div>
      <Field label="Lý do khám">
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="ws-input"
          rows={2}
          required
          data-agent-ref="booking-form:reason"
          data-agent-role="textbox"
          data-agent-label="Lý do khám"
        />
      </Field>
      {error && (
        <FormError agentRef="booking-form:error" agentLabel="Lỗi form đặt lịch">
          {error}
        </FormError>
      )}
      <FormActions
        onCancel={onClose}
        submitting={submitting}
        submitLabel="Đặt lịch"
        pendingLabel="Đang gửi…"
        cancelProps={{
          "data-agent-ref": "booking-form:cancel",
          "data-agent-role": "button",
          "data-agent-label": "Huỷ",
        }}
        submitProps={{
          "data-agent-ref": "booking-form:submit",
          "data-agent-role": "button",
          "data-agent-label": "Đặt lịch",
          "data-agent-busy": submitting ? "true" : undefined,
        }}
      />
      </div>
    </form>
  );
}
