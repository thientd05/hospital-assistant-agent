"use client";

import { useEffect, useState } from "react";
import { useAppointments, appointmentsApi } from "@/hooks/useAppointments";
import { useDoctors } from "@/hooks/useDoctors";
import { useManagingDoctors } from "@/hooks/useManagingDoctors";
import { formatDateTime as fmt } from "@/lib/format";
import { APPOINTMENT_STATUS_STYLES as STATUS_STYLES } from "@/lib/appointment";
import { type CalView, inView } from "@/lib/calendar";
import { CalendarToolbar, MonthGrid } from "../AppointmentCalendar";
import { Field } from "../forms/Field";
import { FormModal, FormHeader, FormError, FormActions } from "../forms/ui";
import { AGENT_URL } from "@/lib/api";
import { authFetch } from "@/lib/tokenStore";

type Props = {
  version: number;
  active: boolean;
  /** Hội thoại AI hiện tại — hook đặt lịch nhờ trợ lý ảo tóm tắt triệu chứng. */
  aiConversationId?: string | null;
};

export function MyAppointmentsTab({ version, active, aiConversationId }: Props) {
  const { data, loading, error, refetch } = useAppointments(version, active);
  const doctorsRes = useDoctors(0, active);
  const [showForm, setShowForm] = useState(false);
  const [view, setView] = useState<CalView>("month");
  const [cursor, setCursor] = useState<Date>(() => new Date());

  const doctorById = new Map(
    (doctorsRes.data?.doctors ?? []).map((d) => [d.id, d])
  );

  // Tuần/Ngày lọc thẻ theo phạm vi; thẻ ngoài phạm vi vẫn gắn DOM (ẩn bằng
  // `hidden`) để agent đọc ngầm được hết. Tháng dùng bảng lịch.
  const rows = data ?? [];
  const visible = (scheduledAt: string | Date) =>
    view !== "month" && inView(scheduledAt, view, cursor);
  const visibleCount = rows.filter((a) => visible(a.scheduledAt)).length;

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
          aiConversationId={aiConversationId}
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

      <CalendarToolbar
        view={view}
        cursor={cursor}
        onView={setView}
        onCursor={setCursor}
      />

      {/* Chế độ Tháng: bảng lịch cả tháng với dấu chấm theo trạng thái. */}
      {view === "month" && !loading && (
        <MonthGrid
          cursor={cursor}
          appointments={rows}
          onPickDay={(d) => {
            setCursor(d);
            setView("day");
          }}
        />
      )}

      {!loading && view !== "month" && visibleCount === 0 && (
        <div className="text-sm text-gray-400 text-center py-4">
          Không có lịch hẹn nào trong {view === "day" ? "ngày" : "tuần"} này.
        </div>
      )}

      {/* Thẻ lịch luôn gắn DOM cho agent; ẩn khi xem Tháng hoặc ngoài phạm vi. */}
      <ul className={view === "month" ? "hidden" : "space-y-2"}>
        {rows.map((a) => (
          <li
            key={a.id}
            data-agent-ref={`appointment:item:${a.id}`}
            data-agent-role="text"
            data-agent-label="Lịch hẹn"
            className={`rounded-lg border border-gray-200 px-3 py-2.5 ${
              visible(a.scheduledAt) ? "" : "hidden"
            }`}
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
            {a.reason && (
              <div className="mt-1.5">
                <div className="text-[10px] uppercase tracking-wider text-[#087E8B] font-medium">
                  Tóm tắt từ trợ lý ảo
                </div>
                <div className="text-xs text-gray-600">{a.reason}</div>
              </div>
            )}
            {a.patientNote && (
              <div className="mt-1.5">
                <div className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">
                  Lời nhắn của bạn
                </div>
                <div className="text-xs text-gray-600">{a.patientNote}</div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function BookingForm({
  active,
  aiConversationId,
  onClose,
  onSaved,
}: {
  active: boolean;
  aiConversationId?: string | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const doctorsRes = useDoctors(0, active);
  const managingRes = useManagingDoctors(0, active);

  const [doctorId, setDoctorId] = useState<string>("");
  const [doctorTouched, setDoctorTouched] = useState(false);
  const [datetime, setDatetime] = useState("");
  const [reason, setReason] = useState("");
  const [patientNote, setPatientNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const managingIds = new Set(
    (managingRes.data?.doctors ?? []).map((d) => d.id)
  );

  // min cho datetime-local = thời điểm hiện tại theo giờ địa phương ("YYYY-MM-DDTHH:MM").
  const nowLocal = (() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  })();

  // Mặc định = bác sĩ đang quản lý đầu tiên (nếu có); BN chưa ai quản lý → "" (hàng chờ chung).
  useEffect(() => {
    if (doctorTouched) return;
    const first = managingRes.data?.doctors?.[0]?.id;
    if (first) setDoctorId(first);
  }, [managingRes.data, doctorTouched]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!datetime) {
      setError("Cần chọn thời gian khám.");
      return;
    }
    // datetime-local trả "YYYY-MM-DDTHH:MM" theo giờ địa phương.
    const scheduled = new Date(datetime);
    if (Number.isNaN(scheduled.getTime())) {
      setError("Thời gian không hợp lệ.");
      return;
    }
    setSubmitting(true);
    try {
      // Hook TRƯỚC KHI LƯU: trường tóm tắt do trợ lý ảo tổng hợp — bệnh nhân KHÔNG
      // tự nhập. Nếu chưa có sẵn (vd agent đã tự điền khi đặt giúp) và có hội thoại
      // AI → nhờ trợ lý ảo tóm tắt triệu chứng (gọi 1 lần, KHÔNG lưu vào hội thoại).
      // Chưa có hội thoại / chưa đủ data → để rỗng, vẫn đặt lịch bình thường.
      let summary = reason.trim();
      if (!summary && aiConversationId) {
        setSummarizing(true);
        try {
          const res = await authFetch(`${AGENT_URL}/api/chat/summarize`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ conversationId: aiConversationId }),
          });
          if (res.ok) {
            const data = (await res.json()) as { summary?: string };
            summary = (data.summary ?? "").trim();
            setReason(summary);
          }
        } catch {
          // Tóm tắt lỗi → vẫn cho đặt lịch với tóm tắt rỗng.
        } finally {
          setSummarizing(false);
        }
      }
      await appointmentsApi.createAsPatient({
        scheduledAt: scheduled.toISOString(),
        ...(summary ? { reason: summary } : {}),
        ...(patientNote.trim() ? { patientNote: patientNote.trim() } : {}),
        ...(doctorId ? { doctorId } : {}),
      });
      onSaved();
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : String(e2));
    } finally {
      setSummarizing(false);
      setSubmitting(false);
    }
  }

  return (
    <FormModal maxWidth={460}>
      <form onSubmit={submit}>
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
      <Field label="Thời gian khám">
        <input
          type="datetime-local"
          value={datetime}
          min={nowLocal}
          onChange={(e) => setDatetime(e.target.value)}
          className="ws-input"
          required
          data-agent-ref="booking-form:datetime"
          data-agent-role="textbox"
          data-agent-label="Thời gian khám"
        />
      </Field>
      <Field label="Tóm tắt từ trợ lý ảo">
        <textarea
          value={summarizing ? "Trợ lý ảo đang tóm tắt…" : reason}
          onChange={(e) => setReason(e.target.value)}
          className="ws-input bg-gray-50 text-gray-600 cursor-not-allowed"
          rows={3}
          readOnly
          placeholder="Trợ lý ảo tự tổng hợp từ cuộc trò chuyện khi bạn đặt lịch — bạn không cần nhập."
          data-agent-ref="booking-form:reason"
          data-agent-role="textbox"
          data-agent-label="Tóm tắt từ trợ lý ảo"
        />
      </Field>
      <Field label="Lời nhắn cho bác sĩ (tuỳ chọn)">
        <textarea
          value={patientNote}
          onChange={(e) => setPatientNote(e.target.value)}
          className="ws-input"
          rows={2}
          placeholder="Điều bạn muốn nhắn riêng với bác sĩ trước khi khám (nếu có)."
          data-agent-ref="booking-form:patientNote"
          data-agent-role="textbox"
          data-agent-label="Lời nhắn cho bác sĩ"
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
        pendingLabel={summarizing ? "Trợ lý ảo đang tóm tắt…" : "Đang gửi…"}
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
    </FormModal>
  );
}
